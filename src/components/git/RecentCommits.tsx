import { useState } from "react";
import { useGitStore } from "../../stores/gitStore";

interface RecentCommitsProps {
  sessionId: string;
}

export default function RecentCommits({ sessionId }: RecentCommitsProps) {
  const { recentCommits, loadRecentCommits, selectCommit } = useGitStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);

  if (recentCommits.length === 0) return null;

  const handleCopyHash = (e: React.MouseEvent, hash: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
  };

  const handleLoadMore = async () => {
    const newCount = displayCount + 50;
    setDisplayCount(newCount);
    await loadRecentCommits(sessionId, newCount);
  };

  const visibleCommits = recentCommits.slice(0, displayCount);
  const hasMore = recentCommits.length >= displayCount;
  const unpushedCount = recentCommits.filter((c) => !c.isPushed).length;

  return (
    <div className="mt-3 px-2">
      <div
        className="flex items-center justify-between py-1.5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 text-text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5l7 7-7 7" />
          </svg>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-[1px]">
            Recent Commits
          </span>
          {unpushedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary">
              {unpushedCount} unpushed
            </span>
          )}
        </div>
        <span className="text-[11px] text-text-muted bg-bg-active px-1.5 py-0.5 rounded min-w-[18px] text-center">
          {recentCommits.length}
        </span>
      </div>

      {isExpanded && (
        <div className="pb-2 max-h-80 overflow-y-auto">
          {visibleCommits.map((commit) => (
            <div
              key={commit.id}
              className="group px-1 py-1.5 hover:bg-bg-hover rounded cursor-pointer relative"
              onClick={() => selectCommit(commit.id, sessionId)}
              title="Click to view commit diff"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    commit.isPushed ? "bg-accent-green" : "bg-accent-primary"
                  }`}
                  title={commit.isPushed ? "Pushed to remote" : "Not pushed"}
                />
                <span className="text-[10px] font-mono text-text-muted">
                  {commit.shortId}
                </span>
                <span className="text-[10px] text-text-muted flex-shrink-0">
                  {commit.timeRelative}
                </span>
                <button
                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-active text-text-muted hover:text-text-primary transition-all"
                  onClick={(e) => handleCopyHash(e, commit.id)}
                  title="Copy commit hash"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-text-secondary truncate mt-0.5 pr-6">
                {commit.message}
              </p>
            </div>
          ))}

          {hasMore && (
            <div className="py-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadMore();
                }}
                className="w-full px-3 py-1.5 text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-active rounded transition-colors"
              >
                Load more commits...
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
