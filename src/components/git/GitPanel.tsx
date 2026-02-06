import { useEffect } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { useGitStore } from "../../stores/gitStore";
import GitPanelHeader from "./GitPanelHeader";
import GitStatusSection from "./GitStatusSection";
import CommitInput from "./CommitInput";
import CommitActions from "./CommitActions";
import RecentCommits from "./RecentCommits";

export default function GitPanel() {
  const { activeSessionId, sessions } = useSessionStore();
  const {
    sessionGitState,
    loadGitStatus,
  } = useGitStore();

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;
  const cwd = activeSession?.cwd;
  const gitState = activeSessionId ? sessionGitState.get(activeSessionId) : null;

  // Load git status when panel opens or session/cwd changes
  useEffect(() => {
    if (activeSessionId && cwd) {
      loadGitStatus(activeSessionId, cwd);
    }
  }, [activeSessionId, cwd, loadGitStatus]);

  // Don't show if no active terminal session or no cwd
  if (!activeSessionId || activeSession?.type !== "terminal" || !cwd) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-bg-terminal">
      <GitPanelHeader sessionId={activeSessionId} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {gitState?.error ? (
          <div className="p-4 text-text-muted">
            <p className="text-sm">{gitState.error}</p>
          </div>
        ) : gitState?.isLoading ? (
          <div className="p-4 text-text-muted">
            <p className="text-sm">Loading...</p>
          </div>
        ) : gitState?.status ? (
          <>
            <GitStatusSection
              title="Staged"
              files={gitState.status.stagedFiles}
              sessionId={activeSessionId}
              staged={true}
            />
            <GitStatusSection
              title="Changed"
              files={gitState.status.changedFiles}
              sessionId={activeSessionId}
              staged={false}
            />
            <GitStatusSection
              title="Untracked"
              files={gitState.status.untrackedFiles}
              sessionId={activeSessionId}
              staged={false}
              isUntracked={true}
            />

            <div className="border-t border-border-subtle mt-2">
              <CommitInput />
              <CommitActions sessionId={activeSessionId} />
            </div>

            <RecentCommits sessionId={activeSessionId} />
          </>
        ) : (
          <div className="p-4 text-text-muted">
            <p className="text-sm">Not a git repository</p>
          </div>
        )}
      </div>
    </div>
  );
}
