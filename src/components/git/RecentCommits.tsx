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
    <div className="border-t border-[#2a2a2a] mt-2">
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 text-[#888] transition-transform ${isExpanded ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-medium text-[#888] uppercase">
            Recent Commits
          </span>
          {unpushedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-600/20 text-yellow-400">
              {unpushedCount} unpushed
            </span>
          )}
        </div>
        <span className="text-xs text-[#666]">{recentCommits.length}</span>
      </div>

      {isExpanded && (
        <div className="pb-2 max-h-80 overflow-y-auto">
          {visibleCommits.map((commit) => (
            <div
              key={commit.id}
              className="group px-3 py-1.5 hover:bg-[#1a1a1a] cursor-pointer relative"
              onClick={() => selectCommit(commit.id, sessionId)}
              title="Click to view commit diff"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    commit.isPushed ? "bg-green-500" : "bg-yellow-500"
                  }`}
                  title={commit.isPushed ? "Pushed to remote" : "Not pushed"}
                />
                <span
                  className={`text-xs font-mono ${
                    commit.isPushed ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  {commit.shortId}
                </span>
                <span className="text-xs text-[#666] flex-shrink-0">
                  {commit.timeRelative}
                </span>
                <button
                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#333] text-[#888] hover:text-[#e0e0e0] transition-all"
                  onClick={(e) => handleCopyHash(e, commit.id)}
                  title="Copy commit hash"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-[#e0e0e0] truncate mt-0.5 pr-6">
                {commit.message}
              </p>
              <p className="text-xs text-[#666] mt-0.5">{commit.author}</p>
            </div>
          ))}

          {hasMore && (
            <div className="px-3 py-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadMore();
                }}
                className="w-full px-3 py-1.5 text-xs text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] rounded transition-colors"
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
