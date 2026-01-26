import { Terminal, type IDisposable } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSessionStore } from "../stores/sessionStore";
import { useSettingsStore } from "../stores/settingsStore";
import { sendNotification } from "./notifications";

const ACTIVITY_NOTIFICATION_COOLDOWN = 5000;

export interface TerminalEntry {
  terminal: Terminal;
  fitAddon: FitAddon;
  webglAddon?: WebglAddon;
  isOpened: boolean;
  container?: HTMLElement;
  dataDisposable?: IDisposable;
  titleDisposable?: IDisposable;
  unlisten?: () => void;
  unlistenPromise?: Promise<() => void>;
  lastActivityNotificationAt: number;
  isDisposed: boolean;
}

const registry = new Map<string, TerminalEntry>();

function createEntry(sessionId: string): TerminalEntry {
  const terminal = new Terminal({
    fontFamily: '"JetBrains Mono", Monaco, monospace',
    fontSize: 14,
    theme: {
      background: "#0a0a0a",
      foreground: "#e5e5e5",
      cursor: "#e5e5e5",
      cursorAccent: "#0a0a0a",
      selectionBackground: "#444444",
      black: "#000000",
      red: "#cd3131",
      green: "#0dbc79",
      yellow: "#e5e510",
      blue: "#2472c8",
      magenta: "#bc3fbc",
      cyan: "#11a8cd",
      white: "#e5e5e5",
      brightBlack: "#666666",
      brightRed: "#f14c4c",
      brightGreen: "#23d18b",
      brightYellow: "#f5f543",
      brightBlue: "#3b8eea",
      brightMagenta: "#d670d6",
      brightCyan: "#29b8db",
      brightWhite: "#ffffff",
    },
    cursorBlink: useSettingsStore.getState().appearance.cursorBlink,
    cursorStyle: useSettingsStore.getState().appearance.cursorStyle,
    allowProposedApi: true,
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

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
    isOpened: false,
    lastActivityNotificationAt: 0,
    isDisposed: false,
  };

  entry.dataDisposable = terminal.onData((data) => {
    invoke("write_to_session", { id: sessionId, data }).catch(console.error);
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

  entry.dataDisposable?.dispose();
  entry.titleDisposable?.dispose();
  entry.webglAddon?.dispose();
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
