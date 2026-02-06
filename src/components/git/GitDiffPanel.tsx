import { useSessionStore } from "../../stores/sessionStore";
import { useGitStore } from "../../stores/gitStore";
import { useResizable } from "../../hooks/useResizable";
import { IconExternalLink } from "@/components/ui/icons";
import DiffViewer from "./DiffViewer";

export default function GitDiffPanel() {
  const { activeSessionId, sessions } = useSessionStore();
  const {
    gitDiffPanelWidth,
    setGitDiffPanelWidth,
    selectedFilePath,
    clearSelectedFile,
    openFileInEditor,
  } = useGitStore();

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;

  // Resize handling - resize from right edge for left-side panel
  const { panelRef, isResizing, handleMouseDown } = useResizable({
    onResize: setGitDiffPanelWidth,
    direction: "right",
  });

  const handleJumpToEditor = () => {
    if (!selectedFilePath || !activeSessionId) return;
    openFileInEditor(selectedFilePath, activeSessionId);
  };

  // Don't show if no active terminal session or no selected file
  if (!activeSessionId || activeSession?.type !== "terminal" || !selectedFilePath) {
    return null;
  }

  const fileName = selectedFilePath.split("/").pop() || selectedFilePath;

  return (
    <div
      ref={panelRef}
      className="relative flex flex-col bg-bg-terminal border-r border-border-subtle"
      style={{ width: gitDiffPanelWidth, minWidth: 300, maxWidth: 600 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-bg-active">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-text-primary truncate">
            {fileName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleJumpToEditor}
            className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-primary transition-colors"
            title="Open in editor"
          >
            <IconExternalLink className="w-4 h-4" stroke={2} />
          </button>
          <button
            onClick={clearSelectedFile}
            className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-hidden">
        <DiffViewer sessionId={activeSessionId} />
      </div>

      {/* Resize handle - on right edge for left-side panel */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent-primary transition-colors ${
          isResizing ? "bg-accent-primary" : "bg-transparent"
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
