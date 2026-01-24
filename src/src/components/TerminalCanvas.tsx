import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSessionStore } from "../stores/sessionStore";

interface Cell {
  char: string;
  fg: string;
  bg: string;
  bold: boolean;
  italic: boolean;
}

interface RenderGrid {
  cols: number;
  rows: number;
  cells: Cell[];
}

interface TerminalCanvasProps {
  sessionId: string;
}

export default function TerminalCanvas({ sessionId }: TerminalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontSize = 14;
  const cellWidth = 8.5;
  const cellHeight = 16;

  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sidebarCollapsed = useSessionStore((state) => state.sidebarCollapsed);
  const isActive = activeSessionId === sessionId;

  // Calculate grid dimensions and handle resize
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      console.log("[TerminalCanvas] updateSize called:", {
        sessionId,
        oldWidth: canvas.width,
        oldHeight: canvas.height,
        newWidth: rect.width,
        newHeight: rect.height,
      });

      canvas.width = rect.width;
      canvas.height = rect.height;

      const cols = Math.floor(canvas.width / cellWidth);
      const rows = Math.floor(canvas.height / cellHeight);

      console.log("[TerminalCanvas] Resizing terminal:", { sessionId, cols, rows });

      // Immediately redraw with cached data after resize (canvas is cleared when dimensions change)
      if (lastRenderDataRef.current && renderGridRef.current) {
        console.log("[TerminalCanvas] Redrawing with cached data after resize");
        renderGridRef.current(lastRenderDataRef.current);
      }

      // Notify backend of size change
      invoke("resize_terminal", { id: sessionId, cols, rows }).catch(console.error);
    };

    updateSize();

    // Handle window resize
    const resizeObserver = new ResizeObserver((entries) => {
      console.log("[TerminalCanvas] ResizeObserver triggered for:", sessionId);
      updateSize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [sessionId, cellWidth, cellHeight]);

  // Stable ref for the render function to avoid closure issues
  const renderGridRef = useRef<(data: RenderGrid) => void>();
  // Cache the last render data to redraw after resize
  const lastRenderDataRef = useRef<RenderGrid | null>(null);

  // Update the render function whenever rendering-related dependencies change
  useEffect(() => {
    renderGridRef.current = (data: RenderGrid) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Cache the render data for redraw after resize
      lastRenderDataRef.current = data;

      console.log("[TerminalCanvas] Rendering grid:", {
        sessionId,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        gridCols: data.cols,
        gridRows: data.rows,
        cellsCount: data.cells.length,
      });

      // Clear canvas
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set font
      ctx.font = `${fontSize}px "JetBrains Mono", Monaco, monospace`;
      ctx.textBaseline = "top";

      // Render cells
      data.cells.forEach((cell, index) => {
        const col = index % data.cols;
        const row = Math.floor(index / data.cols);

        ctx.fillStyle = cell.bg || "#0a0a0a";
        ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);

        if (cell.char) {
          ctx.fillStyle = cell.fg || "#e5e5e5";
          ctx.font = `${cell.bold ? "bold" : ""} ${cell.italic ? "italic" : ""} ${fontSize}px "JetBrains Mono", monospace`;
          ctx.fillText(cell.char, col * cellWidth, row * cellHeight);
        }
      });
    };
  }, [fontSize, cellWidth, cellHeight, sessionId]);

  // Listen for terminal updates
  useEffect(() => {
    console.log("[TerminalCanvas] Session created:", sessionId);

    const unlisten = listen<RenderGrid>(`terminal-update-${sessionId}`, (event) => {
      console.log("[TerminalCanvas] Received update, cells:", event.payload.cells.length);
      renderGridRef.current?.(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [sessionId]);

  // Auto-focus when this session becomes active OR when sidebar state changes
  useEffect(() => {
    console.log("[TerminalCanvas] Auto-focus effect triggered:", {
      sessionId,
      isActive,
      sidebarCollapsed,
      hasCanvas: !!canvasRef.current,
    });
    if (isActive && canvasRef.current) {
      // Use requestAnimationFrame to ensure DOM updates are complete before focusing
      requestAnimationFrame(() => {
        console.log("[TerminalCanvas] Focusing canvas via requestAnimationFrame");
        canvasRef.current?.focus();
        console.log("[TerminalCanvas] After focus, document.activeElement:", document.activeElement?.tagName);
      });
    }
  }, [isActive, sidebarCollapsed, sessionId]);

  const handleClick = () => {
    canvasRef.current?.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    console.log("[TerminalCanvas] handleKeyDown:", {
      key: e.key,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      sessionId,
    });

    // Don't handle global shortcuts (Cmd+T, Cmd+W, Cmd+\, Cmd+1-9)
    if (e.metaKey && (e.key === "t" || e.key === "w" || e.key === "\\" || (e.key >= "1" && e.key <= "9"))) {
      console.log("[TerminalCanvas] Skipping global shortcut, letting App.tsx handle");
      return; // Let App.tsx handle these
    }

    e.preventDefault();

    // Handle Ctrl+key combinations
    if (e.ctrlKey) {
      let key = e.key.toLowerCase();
      // Ctrl+C, Ctrl+D, Ctrl+L, etc.
      const code = key.charCodeAt(0);
      if (code >= 97 && code <= 122) { // a-z
        // Ctrl+key = key - 96 (so Ctrl+A = 1, Ctrl+C = 3, etc.)
        const ctrlChar = String.fromCharCode(code - 96);
        console.log("[TerminalCanvas] Sending Ctrl+key:", { key, ctrlChar, sessionId });
        await invoke("write_to_session", { id: sessionId, data: ctrlChar });
        return;
      }
    }

    // Handle special keys
    let key = e.key;
    if (key === "Enter") key = "\r";
    else if (key === "Tab") key = "\t";
    else if (key === "Backspace") key = "\x08";
    else if (key === "Escape") key = "\x1b";
    else if (key === "ArrowUp") key = "\x1b[A";
    else if (key === "ArrowDown") key = "\x1b[B";
    else if (key === "ArrowRight") key = "\x1b[C";
    else if (key === "ArrowLeft") key = "\x1b[D";
    else if (key === "Home") key = "\x1b[H";
    else if (key === "End") key = "\x1b[F";
    else if (key === "PageUp") key = "\x1b[5~";
    else if (key === "PageDown") key = "\x1b[6~";
    else if (key === "Delete") key = "\x1b[3~";
    else if (key === "Insert") key = "\x1b[2~";
    // Handle single character input
    else if (key.length > 1) {
      // Other special keys we don't handle yet - ignore
      console.log("[TerminalCanvas] Ignoring special key:", key);
      return;
    }

    console.log("[TerminalCanvas] Sending key to session:", { key: JSON.stringify(key), sessionId });
    try {
      await invoke("write_to_session", { id: sessionId, data: key });
      console.log("[TerminalCanvas] Key sent successfully");
    } catch (error) {
      console.error("[TerminalCanvas] Failed to send key:", error);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-text"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  );
}
