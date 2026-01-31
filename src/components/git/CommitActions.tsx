import { useGitStore } from "../../stores/gitStore";
import { IconLoader2, IconCheck, IconRefresh } from "@/components/ui/icons";

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
    push,
  } = useGitStore();

  const gitState = sessionGitState.get(sessionId);
  const stagedCount = gitState?.status?.stagedFiles.length || 0;
  const aheadCount = branchStatus?.ahead || 0;
  const hasRemote = branchStatus?.remoteBranch !== null;

  const isLoading = isCommitting || isPushing;
  const canCommit = commitMessage.trim().length > 0 && stagedCount > 0 && !isLoading;
  const canPush = aheadCount > 0 && hasRemote && !isLoading && stagedCount === 0;

  const handleCommit = async () => {
    const result = await commit(sessionId);
    if (!result.success && result.error) {
      console.error("Commit failed:", result.error);
    }
  };

  const handlePush = async () => {
    const result = await push(sessionId);
    if (!result.success && result.error) {
      console.error("Push failed:", result.error);
    }
  };

  const handleClick = () => {
    if (canCommit) {
      handleCommit();
    } else if (canPush) {
      handlePush();
    }
  };

  const isEnabled = canCommit || canPush;

  return (
    <div className="px-2 pb-2">
      <button
        onClick={handleClick}
        disabled={!isEnabled}
        className={`w-full h-9 px-3 text-[13px] font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
          isEnabled
            ? "bg-accent-green hover:opacity-90 text-white"
            : "bg-bg-active text-text-muted cursor-not-allowed"
        }`}
      >
        {isCommitting ? (
          <>
            <IconLoader2 className="w-4 h-4 animate-spin" stroke={2} />
            Committing...
          </>
        ) : isPushing ? (
          <>
            <IconLoader2 className="w-4 h-4 animate-spin" stroke={2} />
            Syncing...
          </>
        ) : canCommit ? (
          <>
            <IconCheck className="w-4 h-4" stroke={2} />
            Commit
          </>
        ) : canPush ? (
          <>
            <IconRefresh className="w-4 h-4" stroke={2} />
            Sync Changes {aheadCount}↑
          </>
        ) : (
          "Commit"
        )}
      </button>
    </div>
  );
}
