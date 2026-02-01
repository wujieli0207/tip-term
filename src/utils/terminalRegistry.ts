import { Terminal, type IDisposable } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { SerializeAddon } from "@xterm/addon-serialize";
// ImageAddon and LigaturesAddon are loaded dynamically (bundle-conditional)
import type { ImageAddon } from "@xterm/addon-image";
import type { LigaturesAddon } from "@xterm/addon-ligatures";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
// Core stores needed synchronously
import { useSettingsStore } from "../stores/settingsStore";
import { useTerminalSuggestStore } from "../stores/terminalSuggestStore";
// Stores loaded dynamically in callbacks (bundle-barrel-imports)
// import { useSessionStore } from "../stores/sessionStore";
// import { useEditorStore } from "../stores/editorStore";
import { sendNotification } from "./notifications";
import { getTerminalTheme } from "../services/themeService";

// Lazy store getters to avoid barrel imports at module load time
const getSessionStore = () => import("../stores/sessionStore").then(m => m.useSessionStore.getState());
const getEditorStore = () => import("../stores/editorStore").then(m => m.useEditorStore.getState());

const ACTIVITY_NOTIFICATION_COOLDOWN = 5000;
const SUGGEST_DEBOUNCE_MS = 150;
const SUGGEST_LIMIT = 40;

export interface TerminalEntry {
  terminal: Terminal;
  fitAddon: FitAddon;
  webglAddon?: WebglAddon;
  webLinksAddon?: WebLinksAddon;
  searchAddon: SearchAddon;
  unicode11Addon?: Unicode11Addon;
  serializeAddon?: SerializeAddon;
  imageAddon?: ImageAddon;
  ligaturesAddon?: LigaturesAddon;
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

  // Add SearchAddon for terminal search (Cmd+F)
  const searchAddon = new SearchAddon();
  terminal.loadAddon(searchAddon);

  // Add Unicode11Addon for proper emoji and CJK character rendering
  let unicode11Addon: Unicode11Addon | undefined;
  try {
    unicode11Addon = new Unicode11Addon();
    terminal.loadAddon(unicode11Addon);
    terminal.unicode.activeVersion = "11";
  } catch (e) {
    console.warn("[terminalRegistry] Unicode11Addon failed to load:", e);
  }

  // Add SerializeAddon for session persistence
  let serializeAddon: SerializeAddon | undefined;
  try {
    serializeAddon = new SerializeAddon();
    terminal.loadAddon(serializeAddon);
  } catch (e) {
    console.warn("[terminalRegistry] SerializeAddon failed to load:", e);
  }

  // ImageAddon is loaded lazily after terminal is opened (bundle-conditional)
  let imageAddon: ImageAddon | undefined;

  // Add web links addon for clickable URLs
  const webLinksAddon = new WebLinksAddon((_event, uri) => {
    // Open URL in browser
    open(uri).catch((err) => {
      console.error("[terminalRegistry] Failed to open URL:", err);
    });
  });
  terminal.loadAddon(webLinksAddon);

  // Register custom link provider for file paths
  // This detects file paths like /path/to/file.ts, ./file.js, src/file.tsx:10:5
  // Also supports CJK characters (Chinese, Japanese, Korean) in file paths
  const filePathRegex = /(?:^|\s)((?:\.{0,2}\/)?(?:[\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\-]+\/)*[\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\-.]+\.[a-zA-Z0-9]+(?::\d+(?::\d+)?)?)/gu;

  terminal.registerLinkProvider({
    provideLinks: (bufferLineNumber, callback) => {
      const line = terminal.buffer.active.getLine(bufferLineNumber - 1);
      if (!line) {
        callback(undefined);
        return;
      }

      const lineText = line.translateToString();
      const links: Array<{
        range: { start: { x: number; y: number }; end: { x: number; y: number } };
        text: string;
        activate: () => void;
      }> = [];

      let match;
      filePathRegex.lastIndex = 0;
      while ((match = filePathRegex.exec(lineText)) !== null) {
        const filePath = match[1];
        // Skip if it looks like a URL
        if (filePath.includes('://')) continue;

        // Calculate position (account for leading whitespace in match)
        const matchStart = match.index + (match[0].length - match[1].length);
        const startX = matchStart + 1; // 1-indexed
        const endX = matchStart + filePath.length;

        links.push({
          range: {
            start: { x: startX, y: bufferLineNumber },
            end: { x: endX, y: bufferLineNumber },
          },
          text: filePath,
          // Use async activate to enable dynamic store imports (bundle-barrel-imports)
          activate: async () => {
            // Extract path and line/column info
            const pathMatch = filePath.match(/^(.+?)(?::(\d+)(?::(\d+))?)?$/);
            if (!pathMatch) return;

            let path = pathMatch[1];
            // const line = pathMatch[2] ? parseInt(pathMatch[2], 10) : undefined;
            // const column = pathMatch[3] ? parseInt(pathMatch[3], 10) : undefined;

            // Convert relative path to absolute path using session's cwd
            if (!path.startsWith('/')) {
              const sessionStore = await getSessionStore();
              const session = sessionStore.sessions.get(sessionId);
              const cwd = session?.cwd;
              if (cwd) {
                // Handle ./ and ../ prefixes
                if (path.startsWith('./')) {
                  path = `${cwd}/${path.slice(2)}`;
                } else if (path.startsWith('../')) {
                  // For ../ we need to go up one directory from cwd
                  const parentDir = cwd.split('/').slice(0, -1).join('/');
                  path = `${parentDir}/${path.slice(3)}`;
                } else {
                  // Regular relative path (e.g., "package.json", "src/file.ts")
                  path = `${cwd}/${path}`;
                }
              } else {
                console.warn("[terminalRegistry] Cannot resolve relative path: no cwd available for session", sessionId);
                return;
              }
            }

            // Open in editor (dynamic import)
            const editorStore = await getEditorStore();
            editorStore.openFile(path).catch((err: unknown) => {
              console.error("[terminalRegistry] Failed to open file in editor:", err, path);
            });
          },
        });
      }

      callback(links.length > 0 ? links : undefined);
    },
  });

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

  // LigaturesAddon will be loaded after terminal.open() in attachTerminal
  // because it requires DOM access
  let ligaturesAddon: LigaturesAddon | undefined;

  const entry: TerminalEntry = {
    terminal,
    fitAddon,
    webglAddon,
    webLinksAddon,
    searchAddon,
    unicode11Addon,
    serializeAddon,
    imageAddon,
    ligaturesAddon,
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
    // Dynamic import to reduce initial bundle (bundle-barrel-imports)
    getSessionStore().then(store => store.updateSessionTerminalTitle(sessionId, title));
  });

  entry.unlistenPromise = listen<number[]>(`terminal-output-${sessionId}`, async (event) => {
    if (entry.isDisposed) return;
    const data = new Uint8Array(event.payload);
    terminal.write(data);

    // Dynamic import to reduce initial bundle (bundle-barrel-imports)
    const currentState = await getSessionStore();
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

  const wasOpened = entry.isOpened;
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

  // Lazy load heavy addons after terminal.open() (bundle-conditional)
  if (!wasOpened) {
    // Load ImageAddon for iTerm2 imgcat/sixel support
    if (!entry.imageAddon) {
      import("@xterm/addon-image").then(({ ImageAddon }) => {
        if (entry.isDisposed) return;
        try {
          const imageAddon = new ImageAddon({
            enableSizeReports: true,
            sixelSupport: true,
            sixelScrolling: true,
            sixelPaletteLimit: 256,
            storageLimit: 128,
            showPlaceholder: true,
          });
          entry.terminal.loadAddon(imageAddon);
          entry.imageAddon = imageAddon;
        } catch (e) {
          console.warn("[terminalRegistry] ImageAddon failed to load:", e);
        }
      }).catch(() => {
        // Silently ignore if addon can't be loaded
      });
    }

    // Load LigaturesAddon - requires DOM access
    if (!entry.ligaturesAddon) {
      import("@xterm/addon-ligatures").then(({ LigaturesAddon }) => {
        if (entry.isDisposed) return;
        try {
          const ligaturesAddon = new LigaturesAddon();
          entry.terminal.loadAddon(ligaturesAddon);
          entry.ligaturesAddon = ligaturesAddon;
        } catch (e) {
          // LigaturesAddon may fail if font doesn't support ligatures - this is expected
          console.debug("[terminalRegistry] LigaturesAddon not loaded (font may not support ligatures):", e);
        }
      }).catch(() => {
        // Silently ignore if addon can't be loaded
      });
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
  entry.searchAddon?.dispose();
  entry.unicode11Addon?.dispose();
  entry.serializeAddon?.dispose();
  entry.imageAddon?.dispose();
  entry.ligaturesAddon?.dispose();
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

// ============================================================
// Terminal Search Functions
// ============================================================

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

// Shared search options builder (js-early-exit, reduce duplication)
function buildSearchOptions({
  caseSensitive = false,
  wholeWord = false,
  regex = false,
}: SearchOptions) {
  return { caseSensitive, wholeWord, regex };
}

// Internal helper to reduce duplication in searchNext/searchPrevious
function searchDirection(
  sessionId: string,
  query: string,
  direction: "next" | "previous",
  options: SearchOptions = {}
): boolean {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed || !query) return false;

  const searchFn = direction === "next" ? "findNext" : "findPrevious";
  return entry.searchAddon[searchFn](query, buildSearchOptions(options));
}

/**
 * Search for text in terminal and return match info
 */
export function searchTerminal(
  sessionId: string,
  query: string,
  options: SearchOptions = {}
): { found: boolean } {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed || !query) {
    return { found: false };
  }

  const found = entry.searchAddon.findNext(query, {
    ...buildSearchOptions(options),
    decorations: {
      matchBackground: "#fabd2f",
      matchBorder: "#fabd2f",
      matchOverviewRuler: "#fabd2f",
      activeMatchBackground: "#fe8019",
      activeMatchBorder: "#fe8019",
      activeMatchColorOverviewRuler: "#fe8019",
    },
  });

  return { found };
}

/**
 * Find next match in terminal
 */
export function searchNext(
  sessionId: string,
  query: string,
  options: SearchOptions = {}
): boolean {
  return searchDirection(sessionId, query, "next", options);
}

/**
 * Find previous match in terminal
 */
export function searchPrevious(
  sessionId: string,
  query: string,
  options: SearchOptions = {}
): boolean {
  return searchDirection(sessionId, query, "previous", options);
}

/**
 * Clear search highlights
 */
export function clearSearch(sessionId: string): void {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed) return;
  entry.searchAddon.clearDecorations();
}

// ============================================================
// Terminal Serialization Functions
// ============================================================

/**
 * Serialize terminal content for persistence
 */
export function serializeTerminal(sessionId: string): string | null {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed || !entry.serializeAddon) {
    return null;
  }

  try {
    return entry.serializeAddon.serialize();
  } catch (e) {
    console.warn("[terminalRegistry] Failed to serialize terminal:", e);
    return null;
  }
}

/**
 * Restore terminal content from serialized data
 */
export function restoreTerminal(sessionId: string, data: string): boolean {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed || !data) {
    return false;
  }

  try {
    entry.terminal.write(data);
    return true;
  } catch (e) {
    console.warn("[terminalRegistry] Failed to restore terminal:", e);
    return false;
  }
}

// ============================================================
// Terminal Activity Optimization
// ============================================================

/**
 * Set terminal active state for performance optimization
 * Non-active terminals will have reduced rendering to save resources
 */
export function setTerminalActive(sessionId: string, isActive: boolean): void {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed) return;

  // When inactive, disable stdin to reduce processing
  // When active, re-enable stdin and ensure terminal is responsive
  entry.terminal.options.disableStdin = !isActive;

  // Optionally blur/focus based on active state
  if (isActive) {
    // Don't auto-focus here - let the component handle focus management
  } else {
    entry.terminal.blur();
  }
}
