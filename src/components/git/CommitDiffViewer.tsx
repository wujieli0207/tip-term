import { useGitStore } from "../../stores/gitStore";
import { useSessionStore } from "../../stores/sessionStore";
import { IconExternalLink } from "@/components/ui/icons";
import type { FileDiffWithStats } from "../../types/git";
import PierreDiffViewer from "./PierreDiffViewer";

interface DiffFileProps {
  fileDiff: FileDiffWithStats;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenFile?: (path: string) => void;
}

function DiffFile({ fileDiff, isExpanded, onToggle, onOpenFile }: DiffFileProps) {
  const displayName = fileDiff.oldPath && fileDiff.oldPath !== fileDiff.path
    ? `${fileDiff.oldPath} → ${fileDiff.path}`
    : fileDiff.path;

  const handleOpenFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenFile) {
      onOpenFile(fileDiff.path);
    }
  };

  const statusColor = {
    added: "text-green-400",
    deleted: "text-red-400",
    modified: "text-yellow-400",
    renamed: "text-blue-400",
    copied: "text-blue-400",
  }[fileDiff.status] || "text-[#888]";

  return (
    <div className="border-b border-[#2a2a2a]">
      {/* File header - sticky for easy access when scrolling */}
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a] sticky top-0 bg-[#0f0f0f] z-10 border-b border-[#2a2a2a]"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg
            className={`w-3 h-3 text-[#888] transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-[#e0e0e0] truncate font-mono">{displayName}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs capitalize ${statusColor}`}>{fileDiff.status}</span>
          {(fileDiff.additions > 0 || fileDiff.deletions > 0) && (
            <>
              {fileDiff.additions > 0 && (
                <span className="text-xs text-green-400">+{fileDiff.additions}</span>
              )}
              {fileDiff.deletions > 0 && (
                <span className="text-xs text-red-400">-{fileDiff.deletions}</span>
              )}
            </>
          )}
          {onOpenFile && (
            <button
              onClick={handleOpenFile}
              className="p-0.5 rounded hover:bg-[#333] text-[#888] hover:text-blue-400 transition-colors"
              title="Open in editor"
            >
              <IconExternalLink className="w-3.5 h-3.5" stroke={2} />
            </button>
          )}
        </div>
      </div>

      {/* Diff content using PierreDiffViewer */}
      {isExpanded && fileDiff.hunks.length > 0 && (
        <div className="border-t border-[#2a2a2a]">
          <PierreDiffViewer
            fileDiff={fileDiff}
            showViewToggle={false}
            defaultViewMode="stacked"
            fileStatus={fileDiff.status}
            oldPath={fileDiff.oldPath}
          />
        </div>
      )}

      {isExpanded && fileDiff.hunks.length === 0 && (
        <div className="px-3 py-2 text-xs text-[#666] border-t border-[#2a2a2a]">
          No diff content available
        </div>
      )}
    </div>
  );
}

export default function CommitDiffViewer() {
  const { activeSessionId } = useSessionStore();
  const {
    commitDiff,
    isCommitDiffLoading,
    expandedCommitFiles,
    toggleCommitFile,
    expandAllCommitFiles,
    collapseAllCommitFiles,
    openCommitFileInEditor,
  } = useGitStore();

  const handleOpenFile = (filePath: string) => {
    if (activeSessionId) {
      openCommitFileInEditor(filePath, activeSessionId);
    }
  };

  if (isCommitDiffLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[#666]">
        <div className="animate-spin w-5 h-5 border-2 border-[#666] border-t-transparent rounded-full mb-2" />
        <span className="text-sm">Loading commit diff...</span>
      </div>
    );
  }

  if (!commitDiff) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[#666]">
        <span className="text-sm">No commit selected</span>
      </div>
    );
  }

  const hasMultipleFiles = commitDiff.fileDiffs.length > 1;
  const allExpanded = commitDiff.fileDiffs.length > 0 &&
    commitDiff.fileDiffs.every((f) => expandedCommitFiles.has(f.path));
  const allCollapsed = commitDiff.fileDiffs.length > 0 &&
    commitDiff.fileDiffs.every((f) => !expandedCommitFiles.has(f.path));

  return (
    <div className="flex flex-col h-full">
      {/* Commit info */}
      <div className="px-3 py-2 border-b border-[#2a2a2a] bg-[#151515]">
        <p className="text-sm text-[#e0e0e0] whitespace-pre-wrap break-words">
          {commitDiff.commitMessage}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-[#666]">
          <span>{commitDiff.commitAuthor}</span>
          <span>•</span>
          <span>{new Date(commitDiff.commitTime * 1000).toLocaleString()}</span>
        </div>
        {commitDiff.isInitialCommit && (
          <div className="mt-2">
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400">
              Initial commit
            </span>
          </div>
        )}
      </div>

      {/* Expand/Collapse all buttons */}
      {hasMultipleFiles && (
        <div className="px-3 py-1 border-b border-[#2a2a2a] bg-[#151515] flex items-center gap-2">
          <span className="text-xs text-[#666]">{commitDiff.fileDiffs.length} files changed</span>
          <div className="flex-1" />
          {!allExpanded && (
            <button
              onClick={expandAllCommitFiles}
              className="text-xs text-[#888] hover:text-[#e0e0e0] px-2 py-0.5 hover:bg-[#2a2a2a] rounded transition-colors"
            >
              Expand all
            </button>
          )}
          {!allCollapsed && (
            <button
              onClick={collapseAllCommitFiles}
              className="text-xs text-[#888] hover:text-[#e0e0e0] px-2 py-0.5 hover:bg-[#2a2a2a] rounded transition-colors"
            >
              Collapse all
            </button>
          )}
        </div>
      )}

      {/* File diffs */}
      <div className="flex-1 overflow-auto">
        {commitDiff.fileDiffs.length === 0 ? (
          <div className="p-4 text-sm text-[#666]">No files changed in this commit</div>
        ) : (
          commitDiff.fileDiffs.map((fileDiff) => (
            <DiffFile
              key={fileDiff.path}
              fileDiff={fileDiff}
              isExpanded={expandedCommitFiles.has(fileDiff.path)}
              onToggle={() => toggleCommitFile(fileDiff.path)}
              onOpenFile={handleOpenFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
