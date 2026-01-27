import { useGitStore } from "../../stores/gitStore";

interface CommitActionsProps {
  sessionId: string;
}

export default function CommitActions({ sessionId }: CommitActionsProps) {
  const {
    commitMessage,
    isCommitting,
    isPushing,
    branchStatus,
    sessionGitState,
    commit,
    commitAndPush,
    push,
  } = useGitStore();

  const gitState = sessionGitState.get(sessionId);
  const stagedCount = gitState?.status?.stagedFiles.length || 0;
  const aheadCount = branchStatus?.ahead || 0;
  const hasRemote = branchStatus?.remoteBranch !== null;

  const canCommit = commitMessage.trim().length > 0 && stagedCount > 0 && !isCommitting && !isPushing;
  const canPush = aheadCount > 0 && hasRemote && !isCommitting && !isPushing;

  const handleCommit = async () => {
    const result = await commit(sessionId);
    if (!result.success && result.error) {
      console.error("Commit failed:", result.error);
    }
  };

  const handleCommitAndPush = async () => {
    const result = await commitAndPush(sessionId);
    if (!result.success && result.error) {
      console.error("Commit and push failed:", result.error);
    }
  };

  const handlePush = async () => {
    const result = await push(sessionId);
    if (!result.success && result.error) {
      console.error("Push failed:", result.error);
    }
  };

  return (
    <div className="flex gap-2 px-3 pb-3">
      <button
        onClick={handleCommit}
        disabled={!canCommit}
        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
          canCommit
            ? "bg-purple-600 hover:bg-purple-700 text-white"
            : "bg-[#2a2a2a] text-[#666] cursor-not-allowed"
        }`}
      >
        {isCommitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Committing...
          </span>
        ) : (
          `Commit (${stagedCount})`
        )}
      </button>

      <button
        onClick={handleCommitAndPush}
        disabled={!canCommit}
        className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
          canCommit
            ? "bg-[#2a2a2a] hover:bg-[#333] text-[#e0e0e0]"
            : "bg-[#1a1a1a] text-[#666] cursor-not-allowed"
        }`}
        title="Commit and Push"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </button>

      {(canPush || isPushing) && (
        <button
          onClick={handlePush}
          disabled={!canPush}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1 ${
            canPush
              ? "bg-yellow-600 hover:bg-yellow-700 text-white"
              : "bg-[#1a1a1a] text-[#666] cursor-not-allowed"
          }`}
          title={`Push ${aheadCount} commit${aheadCount !== 1 ? "s" : ""} to remote`}
        >
          {isPushing ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
              <span>{aheadCount}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
