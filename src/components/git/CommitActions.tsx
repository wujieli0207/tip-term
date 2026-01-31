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

  // Push doesn't block commit - they can run in parallel
  const canCommit = commitMessage.trim().length > 0 && stagedCount > 0 && !isCommitting;
  const canPush = aheadCount > 0 && hasRemote && !isPushing && stagedCount === 0;

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
    <div className="px-2 pb-2 flex flex-col gap-2">
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

      {/* Background push indicator - non-blocking */}
      {isPushing && (
        <div className="flex items-center justify-center gap-2 text-[12px] text-text-muted">
          <IconLoader2 className="w-3 h-3 animate-spin" stroke={2} />
          <span>Syncing in background...</span>
        </div>
      )}
    </div>
  );
}
