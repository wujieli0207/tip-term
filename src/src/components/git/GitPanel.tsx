import { useEffect } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { useGitStore } from "../../stores/gitStore";
import { useResizable } from "../../hooks/useResizable";
import GitPanelHeader from "./GitPanelHeader";
import GitStatusSection from "./GitStatusSection";
import CommitInput from "./CommitInput";
import CommitActions from "./CommitActions";
import RecentCommits from "./RecentCommits";

export default function GitPanel() {
  const { activeSessionId, sessions } = useSessionStore();
  const {
    gitPanelWidth,
    setGitPanelWidth,
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

  // Resize handling - resize from right edge for left-side panel
  const { panelRef, isResizing, handleMouseDown } = useResizable({
    onResize: setGitPanelWidth,
    direction: "right",
  });

  // Don't show if no active terminal session or no cwd
  if (!activeSessionId || activeSession?.type !== "terminal" || !cwd) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="relative flex flex-col bg-[#0f0f0f] border-r border-[#2a2a2a]"
      style={{ width: gitPanelWidth, minWidth: 250, maxWidth: 500 }}
    >
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

            <RecentCommits />
          </>
        ) : (
          <div className="p-4 text-[#666]">
            <p className="text-sm">Not a git repository</p>
          </div>
        )}
      </div>

      {/* Resize handle - on right edge for left-side panel */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500 transition-colors ${
          isResizing ? "bg-purple-500" : "bg-transparent"
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
