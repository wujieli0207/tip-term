import { useGitStore } from "../../stores/gitStore";
import { useResizable } from "../../hooks/useResizable";
import CommitDiffViewer from "./CommitDiffViewer";

export default function CommitDiffPanel() {
  const {
    commitDiffPanelWidth,
    setCommitDiffPanelWidth,
    selectedCommitId,
    commitDiff,
    clearSelectedCommit,
  } = useGitStore();

  // Resize handling - resize from right edge
  const { panelRef, isResizing, handleMouseDown } = useResizable({
    onResize: setCommitDiffPanelWidth,
    direction: "right",
  });

  // Don't show if no selected commit
  if (!selectedCommitId) {
    return null;
  }

  const shortId = selectedCommitId.slice(0, 7);

  return (
    <div
      ref={panelRef}
      className="relative flex flex-col bg-[#0f0f0f] border-r border-[#2a2a2a]"
      style={{ width: commitDiffPanelWidth, minWidth: 300, maxWidth: 800 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-[#888]">{shortId}</span>
          {commitDiff && (
            <span className="text-sm text-[#e0e0e0] truncate">
              {commitDiff.commitMessage.split("\n")[0]}
            </span>
          )}
        </div>
        <button
          onClick={clearSelectedCommit}
          className="p-1 rounded hover:bg-[#333] text-[#888] hover:text-[#e0e0e0] transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Commit diff content */}
      <div className="flex-1 overflow-hidden">
        <CommitDiffViewer />
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
