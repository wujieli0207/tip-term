import { useSessionStore } from "../../stores/sessionStore";
import { useGitStore } from "../../stores/gitStore";
import { useResizable } from "../../hooks/useResizable";
import DiffViewer from "./DiffViewer";

export default function GitDiffPanel() {
  const { activeSessionId, sessions } = useSessionStore();
  const {
    gitDiffPanelWidth,
    setGitDiffPanelWidth,
    selectedFilePath,
    clearSelectedFile,
  } = useGitStore();

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;

  // Resize handling - resize from right edge for left-side panel
  const { panelRef, isResizing, handleMouseDown } = useResizable({
    onResize: setGitDiffPanelWidth,
    direction: "right",
  });

  // Don't show if no active terminal session or no selected file
  if (!activeSessionId || activeSession?.type !== "terminal" || !selectedFilePath) {
    return null;
  }

  const fileName = selectedFilePath.split("/").pop() || selectedFilePath;

  return (
    <div
      ref={panelRef}
      className="relative flex flex-col bg-[#0f0f0f] border-r border-[#2a2a2a]"
      style={{ width: gitDiffPanelWidth, minWidth: 300, maxWidth: 600 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-[#e0e0e0] truncate">
            {fileName}
          </span>
        </div>
        <button
          onClick={clearSelectedFile}
          className="p-1 rounded hover:bg-[#333] text-[#888] hover:text-[#e0e0e0] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-hidden">
        <DiffViewer sessionId={activeSessionId} />
      </div>

      {/* Resize handle - on right edge for left-side panel */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500 transition-colors ${
          isResizing ? "bg-purple-500" : "bg-transparent"
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
