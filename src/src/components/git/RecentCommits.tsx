import { useGitStore } from "../../stores/gitStore";

export default function RecentCommits() {
  const { recentCommits } = useGitStore();

  if (recentCommits.length === 0) return null;

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  return (
    <div className="border-t border-[#2a2a2a] mt-2">
      <div className="px-3 py-2">
        <span className="text-xs font-medium text-[#888] uppercase">
          Recent Commits
        </span>
      </div>

      <div className="pb-2">
        {recentCommits.map((commit) => (
          <div
            key={commit.id}
            className="group px-3 py-1.5 hover:bg-[#1a1a1a] cursor-pointer"
            onClick={() => handleCopyHash(commit.id)}
            title="Click to copy commit hash"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-purple-400">
                {commit.shortId}
              </span>
              <span className="text-xs text-[#666] flex-shrink-0">
                {commit.timeRelative}
              </span>
            </div>
            <p className="text-sm text-[#e0e0e0] truncate mt-0.5">
              {commit.message}
            </p>
            <p className="text-xs text-[#666] mt-0.5">{commit.author}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
