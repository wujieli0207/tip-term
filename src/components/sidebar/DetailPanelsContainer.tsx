import { useSessionStore } from "../../stores/sessionStore";
import { useGitStore } from "../../stores/gitStore";
import { useEditorStore } from "../../stores/editorStore";
import { GitDiffPanel, CommitDiffPanel } from "../git";
import EditorPanel from "../editor/EditorPanel";

/**
 * DetailPanelsContainer - Renders detail panels that appear to the right of the sidebar
 *
 * This includes:
 * - GitDiffPanel: Shows file diff when a git file is selected
 * - CommitDiffPanel: Shows commit diff when a commit is selected
 * - EditorPanel: Shows code editor for open files (future feature)
 *
 * These panels are mutually exclusive and shown based on their respective visibility states.
 */
export default function DetailPanelsContainer() {
  const { activeSessionId, sessions } = useSessionStore();
  const { gitDiffPanelVisible, commitDiffPanelVisible, selectedFilePath, selectedCommitId } = useGitStore();
  const { editorVisible } = useEditorStore();

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;

  // Only show detail panels for active terminal sessions
  if (!activeSessionId || activeSession?.type !== "terminal") {
    return null;
  }

  // Commit diff panel takes priority over file diff panel
  const showCommitDiff = commitDiffPanelVisible && selectedCommitId;
  const showFileDiff = gitDiffPanelVisible && selectedFilePath && !showCommitDiff;

  return (
    <>
      {showCommitDiff && <CommitDiffPanel />}
      {showFileDiff && <GitDiffPanel />}
      {editorVisible && !showCommitDiff && !showFileDiff && <EditorPanel />}
    </>
  );
}
