import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { useFileTreeStore } from "../../stores/fileTreeStore";
import FileTreeHeader from "./FileTreeHeader";
import FileTreeView from "./FileTreeView";

export default function FileTreePanel() {
  const { activeSessionId, sessions } = useSessionStore();
  const { fileTreeWidth, setFileTreeWidth, initSessionTree } = useFileTreeStore();

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;
  const cwd = activeSession?.cwd;

  // Initialize tree when session or cwd changes
  useEffect(() => {
    if (activeSessionId && cwd) {
      initSessionTree(activeSessionId, cwd);
    }
  }, [activeSessionId, cwd, initSessionTree]);

  // Resize handling
  const panelRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        setFileTreeWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setFileTreeWidth]);

  // Don't show if no active terminal session or no cwd
  if (!activeSessionId || activeSession?.type !== "terminal" || !cwd) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="relative flex flex-col bg-[#0f0f0f] border-r border-[#2a2a2a]"
      style={{ width: fileTreeWidth, minWidth: 150, maxWidth: 500 }}
    >
      <FileTreeHeader sessionId={activeSessionId} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <FileTreeView sessionId={activeSessionId} />
      </div>

      {/* Resize handle */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500 transition-colors ${
          isResizing ? "bg-purple-500" : "bg-transparent"
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
