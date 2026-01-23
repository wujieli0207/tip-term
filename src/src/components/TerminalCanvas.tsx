import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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
  sessionId: string | null;
}

export default function TerminalCanvas({ sessionId }: TerminalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontSize = 14;
  const cellWidth = 8.5;
  const cellHeight = 16;

  // Calculate grid dimensions
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    canvas.width = rect.width;
    canvas.height = rect.height;

    const cols = Math.floor(canvas.width / cellWidth);
    const rows = Math.floor(canvas.height / cellHeight);

    // Notify backend of size change
    if (sessionId) {
      invoke("resize_terminal", { id: sessionId, cols, rows }).catch(console.error);
    }
  }, [sessionId, cellWidth, cellHeight]);

  // Stable ref for the render function to avoid closure issues
  const renderGridRef = useRef<(data: RenderGrid) => void>();

  // Update the render function whenever rendering-related dependencies change
  useEffect(() => {
    renderGridRef.current = (data: RenderGrid) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

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
  }, [fontSize, cellWidth, cellHeight]);

  // Listen for terminal updates
  useEffect(() => {
    if (!sessionId) return;

    console.log("[TerminalCanvas] Session created:", sessionId);

    const unlisten = listen<RenderGrid>(`terminal-update-${sessionId}`, (event) => {
      console.log("[TerminalCanvas] Received update, cells:", event.payload.cells.length);
      renderGridRef.current?.(event.payload);
    });

    // Auto-focus the canvas when session is created
    canvasRef.current?.focus();

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [sessionId]);

  const handleClick = () => {
    canvasRef.current?.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (!sessionId) return;

    e.preventDefault();

    // Handle Ctrl+key combinations
    if (e.ctrlKey) {
      let key = e.key.toLowerCase();
      // Ctrl+C, Ctrl+D, Ctrl+L, etc.
      const code = key.charCodeAt(0);
      if (code >= 97 && code <= 122) { // a-z
        // Ctrl+key = key - 96 (so Ctrl+A = 1, Ctrl+C = 3, etc.)
        await invoke("write_to_session", { id: sessionId, data: String.fromCharCode(code - 96) });
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
      return;
    }

    await invoke("write_to_session", { id: sessionId, data: key });
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
