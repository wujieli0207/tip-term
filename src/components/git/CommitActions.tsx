import { useGitStore } from "../../stores/gitStore";
import { IconLoader2, IconArrowRight, IconArrowUp } from "@/components/ui/icons";

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
    <div className="flex gap-2 px-2 pb-2">
      <button
        onClick={handleCommit}
        disabled={!canCommit}
        className={`flex-1 h-9 px-3 text-[13px] font-medium rounded-md transition-colors ${
          canCommit
            ? "bg-accent-primary hover:opacity-90 text-white"
            : "bg-bg-active text-text-muted cursor-not-allowed"
        }`}
      >
        {isCommitting ? (
          <span className="flex items-center justify-center gap-2">
            <IconLoader2 className="w-4 h-4 animate-spin" stroke={2} />
            Committing...
          </span>
        ) : (
          `Commit (${stagedCount})`
        )}
      </button>

      <button
        onClick={handleCommitAndPush}
        disabled={!canCommit}
        className={`w-11 h-9 flex items-center justify-center rounded-md border transition-colors ${
          canCommit
            ? "bg-bg-active border-border hover:bg-bg-hover text-text-primary"
            : "bg-bg-card border-border text-text-muted cursor-not-allowed"
        }`}
        title="Commit and Push"
      >
        <IconArrowRight className="w-4 h-4" stroke={2} />
      </button>

      {(canPush || isPushing) && (
        <button
          onClick={handlePush}
          disabled={isPushing}
          className={`h-9 px-3 text-[13px] font-medium rounded-md transition-colors flex items-center gap-1 ${
            isPushing
              ? "bg-accent-orange/50 text-white/70 cursor-wait"
              : canPush
                ? "bg-accent-orange hover:opacity-90 text-white"
                : "bg-bg-card text-text-muted cursor-not-allowed"
          }`}
          title={isPushing ? "Pushing..." : `Push ${aheadCount} commit${aheadCount !== 1 ? "s" : ""} to remote`}
        >
          {isPushing ? (
            <>
              <IconLoader2 className="w-4 h-4 animate-spin" stroke={2} />
              <span className="text-xs">Pushing</span>
            </>
          ) : (
            <>
              <IconArrowUp className="w-4 h-4" stroke={2} />
              <span>{aheadCount}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
