import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { useSessionStore } from "../stores/sessionStore";

interface XTerminalProps {
  sessionId: string;
}

export default function XTerminal({ sessionId }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sidebarCollapsed = useSessionStore((state) => state.sidebarCollapsed);
  const isActive = activeSessionId === sessionId;

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
      cursorBlink: true,
      cursorStyle: "block",
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

    // Listen for terminal output from backend
    const unlistenPromise = listen<number[]>(`terminal-output-${sessionId}`, (event) => {
      const data = new Uint8Array(event.payload);
      terminal.write(data);
    });

    // Cleanup
    return () => {
      dataDisposable.dispose();
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
