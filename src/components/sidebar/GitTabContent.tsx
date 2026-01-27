import { useEffect } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { useGitStore } from "../../stores/gitStore";
import GitPanelHeader from "../git/GitPanelHeader";
import GitStatusSection from "../git/GitStatusSection";
import CommitInput from "../git/CommitInput";
import CommitActions from "../git/CommitActions";
import RecentCommits from "../git/RecentCommits";

export default function GitTabContent() {
  const { activeSessionId, sessions } = useSessionStore();
  const {
    sessionGitState,
    loadGitStatus,
  } = useGitStore();

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;
  const cwd = activeSession?.cwd;
  const gitState = activeSessionId ? sessionGitState.get(activeSessionId) : null;

  // Load git status when tab opens or session/cwd changes
  useEffect(() => {
    if (activeSessionId && cwd) {
      loadGitStatus(activeSessionId, cwd);
    }
  }, [activeSessionId, cwd, loadGitStatus]);

  // Don't show if no active terminal session or no cwd
  if (!activeSessionId || activeSession?.type !== "terminal" || !cwd) {
    return (
      <div className="px-3 py-4 text-sm text-center text-gray-500">
        No active session or working directory.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
      <GitPanelHeader sessionId={activeSessionId} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {gitState?.error ? (
          <div className="p-4 text-[#666]">
            <p className="text-sm">{gitState.error}</p>
          </div>
        ) : gitState?.isLoading ? (
          <div className="p-4 text-[#666]">
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

            <div className="border-t border-[#2a2a2a] mt-2">
              <CommitInput />
              <CommitActions sessionId={activeSessionId} />
            </div>

            <RecentCommits sessionId={activeSessionId} />
          </>
        ) : (
          <div className="p-4 text-[#666]">
            <p className="text-sm">Not a git repository</p>
          </div>
        )}
      </div>
    </div>
  );
}
