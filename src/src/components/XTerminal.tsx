import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { useSessionStore } from "../stores/sessionStore";
import { useSidebarStore } from "../stores/sidebarStore";
import { useSettingsStore } from "../stores/settingsStore";
import { sendNotification } from "../utils/notifications";

interface XTerminalProps {
  sessionId: string;
}

// Cooldown for activity notifications (5 seconds)
const ACTIVITY_NOTIFICATION_COOLDOWN = 5000;

export default function XTerminal({ sessionId }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastActivityNotificationRef = useRef<number>(0);

  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sidebarCollapsed = useSidebarStore((state) => state.collapsed);
  const isActive = activeSessionId === sessionId;

  const cursorStyle = useSettingsStore((state) => state.appearance.cursorStyle);
  const cursorBlink = useSettingsStore((state) => state.appearance.cursorBlink);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

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

    terminal.open(containerRef.current);

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

    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initial resize notification to backend
    const { cols, rows } = terminal;
    invoke("resize_terminal", { id: sessionId, cols, rows }).catch(console.error);

    // Handle user input - send to backend
    const dataDisposable = terminal.onData((data) => {
      invoke("write_to_session", { id: sessionId, data }).catch(console.error);
    });

    // Listen for terminal title changes (OSC 0/1/2 sequences)
    const titleDisposable = terminal.onTitleChange((title) => {
      useSessionStore.getState().updateSessionTerminalTitle(sessionId, title);
    });

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
        if (now - lastActivityNotificationRef.current >= ACTIVITY_NOTIFICATION_COOLDOWN) {
          lastActivityNotificationRef.current = now;
          sendNotification({
            title: "Terminal Activity",
            body: `New output in session`,
            sessionId,
          });
        }
      }
    });

    // Cleanup
    return () => {
      dataDisposable.dispose();
      titleDisposable.dispose();
      unlistenPromise.then((unlisten) => unlisten());
      terminal.dispose();
    };
  }, [sessionId]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !fitAddonRef.current || !terminalRef.current) return;

    const handleResize = () => {
      if (!fitAddonRef.current || !terminalRef.current) return;

      fitAddonRef.current.fit();
      const { cols, rows } = terminalRef.current;
      invoke("resize_terminal", { id: sessionId, cols, rows }).catch(console.error);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [sessionId]);

  // Auto-focus when session becomes active or sidebar state changes
  useEffect(() => {
    if (isActive && terminalRef.current) {
      requestAnimationFrame(() => {
        terminalRef.current?.focus();
      });
    }
  }, [isActive, sidebarCollapsed]);

  // Apply cursor style changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.cursorStyle = cursorStyle;
    }
  }, [cursorStyle]);

  // Apply cursor blink changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.cursorBlink = cursorBlink;
    }
  }, [cursorBlink]);

  const handleClick = () => {
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
