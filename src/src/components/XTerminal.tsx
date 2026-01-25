import { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { useSessionStore } from "../stores/sessionStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useSplitPaneStore } from "../stores/splitPaneStore";
import { sendNotification } from "../utils/notifications";

interface XTerminalProps {
  sessionId: string;
}

// Cooldown for activity notifications (5 seconds)
const ACTIVITY_NOTIFICATION_COOLDOWN = 5000;

interface TerminalCacheEntry {
  terminal: Terminal;
  fitAddon: FitAddon;
  container: HTMLDivElement | null;
  isOpened: boolean;
  dataDisposable: { dispose: () => void };
  titleDisposable: { dispose: () => void };
  unlistenPromise: Promise<() => void>;
  lastActivityNotification: number;
}

const terminalCache = new Map<string, TerminalCacheEntry>();

const isSessionNotFoundError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Session not found") || message.includes("NotFoundError");
};

export default function XTerminal({ sessionId }: XTerminalProps) {
  // sessionId here is actually ptyId (passed from TerminalContainer)
  const ptyId = sessionId;
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerElement(node);
  }, []);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sidebarCollapsed = useSessionStore((state) => state.sidebarCollapsed);

  const cursorStyle = useSettingsStore((state) => state.appearance.cursorStyle);
  const cursorBlink = useSettingsStore((state) => state.appearance.cursorBlink);

  const safeInvoke = useCallback(
    async (command: string, payload: Record<string, unknown>) => {
      try {
        await invoke(command, payload);
      } catch (error) {
        if (isSessionNotFoundError(error)) return;
        console.error(`[XTerminal] ${command} failed:`, error);
      }
    },
    []
  );

  // Check if this pty belongs to the active session
  const belongsToActiveSession = useSessionStore((state) => {
    if (!activeSessionId) return false;
    const session = state.sessions.get(activeSessionId);
    return session?.ptyIds.includes(ptyId) ?? false;
  });

  // Check if this terminal's pane is the focused one in split pane mode
  const isFocusedPane = useSplitPaneStore((state) => {
    if (!activeSessionId) return false;

    const layoutTree = state.layoutTrees.get(activeSessionId);

    // No layout means layout is initializing - check if this is the first PTY of the session
    if (!layoutTree) {
      const session = useSessionStore.getState().sessions.get(activeSessionId);
      return session?.ptyIds[0] === ptyId;
    }

    const focusedPaneId = state.focusedPanes.get(activeSessionId);
    if (!focusedPaneId) return false;

    // First try to check via pane elements (most reliable when available)
    const paneInfo = state.paneElements.get(focusedPaneId);
    if (paneInfo) {
      return paneInfo.ptyId === ptyId;
    }

    // Fallback: check the layout tree directly for the focused pane's ptyId
    const findPtyIdForPane = (node: typeof layoutTree, targetId: string): string | null => {
      if (!node) return null;
      if (node.type === "terminal") {
        return node.id === targetId ? node.ptyId : null;
      }
      return findPtyIdForPane(node.children[0], targetId) || findPtyIdForPane(node.children[1], targetId);
    };

    const focusedPtyId = findPtyIdForPane(layoutTree, focusedPaneId);
    return focusedPtyId === ptyId;
  });

  // Combined check - this terminal should be focused if it belongs to active session AND is the focused pane
  const shouldBeFocused = belongsToActiveSession && isFocusedPane;

  // Initialize terminal
  useEffect(() => {
    if (!containerElement) return;

    let cached = terminalCache.get(ptyId);
    if (!cached) {
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

      // Try to load WebGL addon with fallback
      try {
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => {
          webglAddon.dispose();
        });
        terminal.loadAddon(webglAddon);
      } catch (e) {
        console.warn("[XTerminal] WebGL addon failed, using canvas renderer:", e);
      }

      // Handle user input - send to backend
      const dataDisposable = terminal.onData((data) => {
        safeInvoke("write_to_session", { id: sessionId, data });
      });

      // Listen for terminal title changes (OSC 0/1/2 sequences)
      const titleDisposable = terminal.onTitleChange((title) => {
        useSessionStore.getState().updateSessionTerminalTitle(sessionId, title);
      });

      const entry: TerminalCacheEntry = {
        terminal,
        fitAddon,
        container: null,
        isOpened: false,
        dataDisposable,
        titleDisposable,
        unlistenPromise: Promise.resolve(() => {}),
        lastActivityNotification: 0,
      };

      // Listen for terminal output from backend
      const unlistenPromise = listen<number[]>(`terminal-output-${sessionId}`, (event) => {
        const data = new Uint8Array(event.payload);
        terminal.write(data);

        // Activity notification for non-active sessions
        const currentState = useSessionStore.getState();
        const currentSession = currentState.sessions.get(sessionId);
        const isCurrentlyActive = currentState.activeSessionId === sessionId;

        if (
          currentSession?.notifyOnActivity &&
          !isCurrentlyActive &&
          data.length > 0
        ) {
          const now = Date.now();
          if (now - entry.lastActivityNotification >= ACTIVITY_NOTIFICATION_COOLDOWN) {
            entry.lastActivityNotification = now;
            sendNotification({
              title: "Terminal Activity",
              body: `New output in session`,
              sessionId,
            });
          }
        }
      });

      entry.unlistenPromise = unlistenPromise;

      cached = entry;
      terminalCache.set(ptyId, entry);
    }

    if (cached.container !== containerElement) {
      cached.container = containerElement;
      if (!cached.isOpened) {
        cached.terminal.open(containerElement);
        cached.isOpened = true;
      } else if (cached.terminal.element) {
        containerElement.appendChild(cached.terminal.element);
      }
      cached.fitAddon.fit();
      const { cols, rows } = cached.terminal;
      safeInvoke("resize_terminal", { id: sessionId, cols, rows });
    }

    terminalRef.current = cached.terminal;
    fitAddonRef.current = cached.fitAddon;

    return () => {
      const existing = terminalCache.get(ptyId);
      if (existing) {
        existing.container = null;
      }
    };
  }, [sessionId, containerElement, safeInvoke]);

  const ptyExists = useSessionStore((state) =>
    Array.from(state.sessions.values()).some((session) => session.ptyIds.includes(ptyId))
  );

  // Dispose terminal when PTY is removed
  useEffect(() => {
    if (ptyExists) return;
    const cached = terminalCache.get(ptyId);
    if (!cached) return;
    cached.dataDisposable.dispose();
    cached.titleDisposable.dispose();
    cached.unlistenPromise.then((unlisten) => unlisten());
    cached.terminal.dispose();
    terminalCache.delete(ptyId);
  }, [ptyExists, ptyId]);

  // Handle resize
  useEffect(() => {
    if (!containerElement || !fitAddonRef.current || !terminalRef.current) return;

    const handleResize = () => {
      if (!fitAddonRef.current || !terminalRef.current) return;

      fitAddonRef.current.fit();
      const { cols, rows } = terminalRef.current;
      safeInvoke("resize_terminal", { id: sessionId, cols, rows });
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [sessionId, safeInvoke, containerElement]);

  // Auto-focus when this pane becomes focused in split mode, blur when unfocused
  // Also control cursorBlink - only blink when this terminal is focused
  useEffect(() => {
    if (!terminalRef.current) return;

    const settingsCursorBlink = useSettingsStore.getState().appearance.cursorBlink;

    if (shouldBeFocused) {
      // Restore cursor blink from settings when focused
      terminalRef.current.options.cursorBlink = settingsCursorBlink;
      // Synchronously focus to avoid conflicts with macOS IME
      terminalRef.current.focus();
    } else {
      // Disable cursor blink when unfocused, then blur
      terminalRef.current.options.cursorBlink = false;
      terminalRef.current.blur();
    }
  }, [shouldBeFocused, sidebarCollapsed]);

  // Apply cursor style changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.cursorStyle = cursorStyle;
    }
  }, [cursorStyle]);

  // Apply cursor blink changes - only when focused
  useEffect(() => {
    if (terminalRef.current) {
      // Only apply cursorBlink from settings if this terminal should be focused
      // Unfocused terminals should keep cursorBlink = false
      terminalRef.current.options.cursorBlink = shouldBeFocused ? cursorBlink : false;
    }
  }, [cursorBlink, shouldBeFocused]);

  const handleClick = () => {
    // Update focus state in store so overlay switches correctly
    if (activeSessionId) {
      const pane = useSplitPaneStore.getState().findPaneByPtyId(activeSessionId, ptyId);
      if (pane) {
        useSplitPaneStore.getState().setFocusedPane(activeSessionId, pane.id);
      }
    }
    terminalRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      onClick={handleClick}
    />
  );
}
