import { Terminal, type IDisposable } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { useSessionStore } from "../stores/sessionStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useTerminalSuggestStore } from "../stores/terminalSuggestStore";
import { sendNotification } from "./notifications";
import { getTerminalTheme } from "../services/themeService";

const ACTIVITY_NOTIFICATION_COOLDOWN = 5000;
const SUGGEST_DEBOUNCE_MS = 150;
const SUGGEST_LIMIT = 40;

export interface TerminalEntry {
  terminal: Terminal;
  fitAddon: FitAddon;
  webglAddon?: WebglAddon;
  webLinksAddon?: WebLinksAddon;
  isOpened: boolean;
  container?: HTMLElement;
  dataDisposable?: IDisposable;
  titleDisposable?: IDisposable;
  unlisten?: () => void;
  unlistenPromise?: Promise<() => void>;
  lastActivityNotificationAt: number;
  isDisposed: boolean;
  inputBuffer: string;
  suggestLastPrefix: string;
  suggestFetchTimeout?: number | null;
}

const registry = new Map<string, TerminalEntry>();

function createEntry(sessionId: string): TerminalEntry {
  const settings = useSettingsStore.getState().appearance;
  const fontFamily = settings.fontFamily ?? "JetBrains Mono";
  const fontSize = settings.fontSize ?? 14;
  const lineHeight = settings.lineHeight ?? 1.4;
  const terminal = new Terminal({
    fontFamily: `"${fontFamily}", Monaco, monospace`,
    fontSize: fontSize,
    lineHeight: lineHeight,
    theme: getTerminalTheme(),
    cursorBlink: settings.cursorBlink,
    cursorStyle: settings.cursorStyle,
    allowProposedApi: true,
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  // Add web links addon for clickable URLs
  const webLinksAddon = new WebLinksAddon((_event, uri) => {
    open(uri).catch((err) => {
      console.error("[terminalRegistry] Failed to open URL:", err);
    });
  });
  terminal.loadAddon(webLinksAddon);

  let webglAddon: WebglAddon | undefined;
  try {
    webglAddon = new WebglAddon();
    webglAddon.onContextLoss(() => {
      console.warn(`[terminalRegistry] WebGL context lost for session ${sessionId}, falling back to canvas renderer`);
      webglAddon?.dispose();
    });
    terminal.loadAddon(webglAddon);
  } catch (e) {
    console.warn("[terminalRegistry] WebGL addon failed to load, using canvas renderer:", e);
    webglAddon = undefined;
  }

  const entry: TerminalEntry = {
    terminal,
    fitAddon,
    webglAddon,
    webLinksAddon,
    isOpened: false,
    lastActivityNotificationAt: 0,
    isDisposed: false,
    inputBuffer: "",
    suggestLastPrefix: "",
    suggestFetchTimeout: null,
  };

  useTerminalSuggestStore.getState().ensureSession(sessionId);

  const clearSuggestState = () => {
    const suggestStore = useTerminalSuggestStore.getState();
    suggestStore.setSuggestions(sessionId, []);
    suggestStore.closePopup(sessionId);
    entry.suggestLastPrefix = "";
  };

  const scheduleSuggestFetch = (prefix: string, forcePopup: boolean) => {
    const suggestStore = useTerminalSuggestStore.getState();
    if (forcePopup) {
      suggestStore.openPopup(sessionId);
    }

    if (entry.suggestFetchTimeout) {
      clearTimeout(entry.suggestFetchTimeout);
    }

    entry.suggestFetchTimeout = setTimeout(() => {
      entry.suggestFetchTimeout = null;
      if (!forcePopup && prefix === entry.suggestLastPrefix) return;
      entry.suggestLastPrefix = prefix;

      invoke<string[]>("get_shell_history", { prefix, limit: SUGGEST_LIMIT })
        .then((suggestions) => {
          suggestStore.setSuggestions(sessionId, suggestions);
        })
        .catch(() => {
          suggestStore.setSuggestions(sessionId, []);
        });
    }, SUGGEST_DEBOUNCE_MS) as unknown as number;
  };

  const updateInputBuffer = (data: string) => {
    const suggestStore = useTerminalSuggestStore.getState();
    for (const char of data) {
      if (char === "\r" || char === "\n") {
        entry.inputBuffer = "";
        clearSuggestState();
        continue;
      }
      if (char === "\u007f") {
        entry.inputBuffer = entry.inputBuffer.slice(0, -1);
        continue;
      }
      if (char === "\u0015") {
        entry.inputBuffer = "";
        continue;
      }
      if (char === "\u0017") {
        entry.inputBuffer = entry.inputBuffer.replace(/\s+\S*$/, "");
        continue;
      }
      if (char >= " " && char !== "\u007f") {
        entry.inputBuffer += char;
      }
    }

    suggestStore.setInput(sessionId, entry.inputBuffer);

    const popupOpen = suggestStore.entries.get(sessionId)?.popupOpen ?? false;
    const prefix = entry.inputBuffer;
    if (prefix.length === 0 && !popupOpen) {
      clearSuggestState();
      return;
    }

    scheduleSuggestFetch(prefix, false);
  };

  const acceptSuggestion = (selected?: string) => {
    const suggestStore = useTerminalSuggestStore.getState();
    const entryState = suggestStore.entries.get(sessionId);
    if (!entryState || entryState.suggestions.length === 0) return;

    const suggestion =
      selected ?? entryState.suggestions[entryState.selectedIndex] ?? entryState.suggestions[0];
    if (!suggestion) return;

    if (suggestion === entry.inputBuffer) return;
    if (!suggestion.startsWith(entry.inputBuffer)) return;

    const remainder = suggestion.slice(entry.inputBuffer.length);
    if (!remainder) return;

    entry.inputBuffer = suggestion;
    suggestStore.setInput(sessionId, entry.inputBuffer);
    suggestStore.closePopup(sessionId);
    invoke("write_to_session", { id: sessionId, data: remainder }).catch(console.error);
  };

  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type !== "keydown") return true;

    const suggestStore = useTerminalSuggestStore.getState();
    const entryState = suggestStore.entries.get(sessionId);
    const popupOpen = entryState?.popupOpen ?? false;
    const suggestions = entryState?.suggestions ?? [];

    if (event.key === "Tab" && suggestions.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      acceptSuggestion();
      return false;
    }

    if (event.key === "ArrowUp" && popupOpen) {
      event.preventDefault();
      event.stopPropagation();
      suggestStore.moveSelection(sessionId, "up");
      return false;
    }

    if (event.key === "ArrowDown" && popupOpen) {
      event.preventDefault();
      event.stopPropagation();
      suggestStore.moveSelection(sessionId, "down");
      return false;
    }

    if (event.key === "Enter" && popupOpen && suggestions.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      acceptSuggestion();
      return false;
    }

    if (event.key === "Escape" && popupOpen) {
      event.preventDefault();
      event.stopPropagation();
      suggestStore.closePopup(sessionId);
      return false;
    }

    return true;
  });

  entry.dataDisposable = terminal.onData((data) => {
    invoke("write_to_session", { id: sessionId, data }).catch(console.error);
    updateInputBuffer(data);
  });

  entry.titleDisposable = terminal.onTitleChange((title) => {
    useSessionStore.getState().updateSessionTerminalTitle(sessionId, title);
  });

  entry.unlistenPromise = listen<number[]>(`terminal-output-${sessionId}`, (event) => {
    if (entry.isDisposed) return;
    const data = new Uint8Array(event.payload);
    terminal.write(data);

    const currentState = useSessionStore.getState();
    const currentSession = currentState.sessions.get(sessionId);
    const isCurrentlyActive = currentState.activeSessionId === sessionId;

    if (currentSession?.notifyOnActivity && !isCurrentlyActive && data.length > 0) {
      const now = Date.now();
      if (now - entry.lastActivityNotificationAt >= ACTIVITY_NOTIFICATION_COOLDOWN) {
        entry.lastActivityNotificationAt = now;
        sendNotification({
          title: "Terminal Activity",
          body: "New output in session",
          sessionId,
        });
      }
    }
  });

  entry.unlistenPromise.then((unlisten) => {
    entry.unlisten = unlisten;
    if (entry.isDisposed) {
      unlisten();
    }
  });

  return entry;
}

export function getOrCreateTerminal(sessionId: string): TerminalEntry {
  let entry = registry.get(sessionId);
  if (!entry) {
    entry = createEntry(sessionId);
    registry.set(sessionId, entry);
  }
  return entry;
}

export function attachTerminal(sessionId: string, container: HTMLElement): TerminalEntry {
  const entry = getOrCreateTerminal(sessionId);
  if (entry.container === container) {
    return entry;
  }

  if (!entry.isOpened) {
    entry.terminal.open(container);
    entry.isOpened = true;
  } else {
    const element = entry.terminal.element;
    if (element && element.parentElement !== container) {
      container.innerHTML = "";
      container.appendChild(element);
    }
  }

  entry.container = container;
  if (import.meta.env.DEV) {
    const element = entry.terminal.element;
    if (element && element.parentElement !== container) {
      console.warn("[terminalRegistry] terminal element not attached", {
        sessionId,
      });
    }
  }
  return entry;
}

export function detachTerminal(sessionId: string, container?: HTMLElement): void {
  const entry = registry.get(sessionId);
  if (!entry) return;
  if (container && entry.container !== container) return;
  if (entry.container) {
    entry.container.innerHTML = "";
    entry.container = undefined;
  }
}

export function disposeTerminal(sessionId: string): void {
  const entry = registry.get(sessionId);
  if (!entry) return;
  entry.isDisposed = true;

  if (entry.suggestFetchTimeout) {
    clearTimeout(entry.suggestFetchTimeout);
    entry.suggestFetchTimeout = null;
  }
  useTerminalSuggestStore.getState().resetSession(sessionId);

  entry.dataDisposable?.dispose();
  entry.titleDisposable?.dispose();
  entry.webglAddon?.dispose();
  entry.webLinksAddon?.dispose();
  if (entry.unlisten) {
    entry.unlisten();
  } else if (entry.unlistenPromise) {
    entry.unlistenPromise.then((unlisten) => unlisten());
  }
  entry.terminal.dispose();
  registry.delete(sessionId);
}

export function cleanupTerminals(activeSessionIds: Set<string>): void {
  for (const sessionId of registry.keys()) {
    if (!activeSessionIds.has(sessionId)) {
      disposeTerminal(sessionId);
    }
  }
}

/**
 * Update the theme for all active terminals
 */
export function updateTerminalThemes(): void {
  const newTheme = getTerminalTheme();
  for (const entry of registry.values()) {
    if (!entry.isDisposed) {
      entry.terminal.options.theme = newTheme;
    }
  }
}

/**
 * Update cursor settings for all active terminals
 */
export function updateTerminalCursorSettings(): void {
  const settings = useSettingsStore.getState().appearance;
  for (const entry of registry.values()) {
    if (!entry.isDisposed) {
      entry.terminal.options.cursorBlink = settings.cursorBlink;
      entry.terminal.options.cursorStyle = settings.cursorStyle;
    }
  }
}

/**
 * Update font settings for all active terminals
 */
export function updateTerminalFontSettings(): void {
  const settings = useSettingsStore.getState().appearance;
  const fontFamily = settings.fontFamily ?? "JetBrains Mono";
  const fontSize = settings.fontSize ?? 14;
  const lineHeight = settings.lineHeight ?? 1.4;
  for (const entry of registry.values()) {
    if (!entry.isDisposed) {
      entry.terminal.options.fontSize = fontSize;
      entry.terminal.options.fontFamily = `"${fontFamily}", Monaco, monospace`;
      entry.terminal.options.lineHeight = lineHeight;
      // Trigger a fit to recalculate dimensions with new font size
      try {
        entry.fitAddon.fit();
      } catch (e) {
        // Ignore fit errors
      }
    }
  }
}
