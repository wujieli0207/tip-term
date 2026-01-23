import { useEffect, useRef, useState } from "react";
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
  const [grid, setGrid] = useState<RenderGrid | null>(null);
  const [fontSize] = useState(14);
  const [cellWidth, setCellWidth] = useState(8.5);
  const [cellHeight, setCellHeight] = useState(16);

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

  // Listen for terminal updates
  useEffect(() => {
    if (!sessionId) return;

    const unlisten = listen<RenderGrid>(`terminal-update-${sessionId}`, (event) => {
      setGrid(event.payload);
      renderGrid(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [sessionId]);

  const renderGrid = (data: RenderGrid) => {
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

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (!sessionId) return;

    // Handle special keys
    let key = e.key;
    if (key === "Enter") key = "\r";
    else if (key === "Tab") {
      e.preventDefault();
      key = "\t";
    } else if (key === "Backspace") key = "\x08";
    else if (key === "Escape") key = "\x1b";

    await invoke("write_to_session", { id: sessionId, data: key });
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-text"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    />
  );
}
