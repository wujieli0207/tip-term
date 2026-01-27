import { useSessionStore } from "../../stores/sessionStore";
import { useFileTreeStore } from "../../stores/fileTreeStore";
import { useEditorStore } from "../../stores/editorStore";
import { useGitStore } from "../../stores/gitStore";
import { useEffect } from "react";
import { useSplitPaneStore } from "../../stores/splitPaneStore";
import type { PaneNode } from "../../types/splitPane";
import XTerminal from "../XTerminal";
import SplitPaneContainer from "./SplitPaneContainer";
import SettingsContainer from "../settings/SettingsContainer";
import FileTreePanel from "../filetree/FileTreePanel";
import EditorPanel from "../editor/EditorPanel";
import { GitPanel, GitDiffPanel } from "../git";
import { cleanupTerminals } from "../../utils/terminalRegistry";

export default function TerminalContainer() {
  const {
    getSessionsList,
    getTerminalSessions,
    activeSessionId,
    createSession,
    sessions,
  } = useSessionStore();
  const { fileTreeVisible } = useFileTreeStore();
  const { editorVisible } = useEditorStore();
  const { gitPanelVisible, gitDiffPanelVisible } = useGitStore();
  const hasLayout = useSplitPaneStore((state) => state.hasLayout);
  const layouts = useSplitPaneStore((state) => state.layouts);
  const sessionsList = getSessionsList();
  const terminalSessions = getTerminalSessions();

  // Get active session to check if it's a terminal
  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;

  useEffect(() => {
    const activeIds = new Set<string>();
    for (const session of terminalSessions) {
      activeIds.add(session.id);
    }
    const collectSplitSessions = (node: PaneNode) => {
      if (node.type === "terminal") {
        activeIds.add(node.sessionId);
        return;
      }
      collectSplitSessions(node.children[0]);
      collectSplitSessions(node.children[1]);
    };
    for (const layout of layouts.values()) {
      collectSplitSessions(layout.root);
    }
    cleanupTerminals(activeIds);
  }, [terminalSessions, layouts]);

  // Show empty state if no terminal sessions and settings is not active
  if (terminalSessions.length === 0 && activeSession?.type !== "settings") {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="mb-4 text-gray-500">No active sessions</div>
          <button
            onClick={() => createSession()}
            className="px-4 py-2 text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Create New Session
          </button>
          <div className="mt-3 text-sm text-gray-600">
            or press <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-xs">Cmd+T</kbd>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-[#0a0a0a]">
      {/* Left side panels */}
      {fileTreeVisible && activeSession?.type === "terminal" && (
        <FileTreePanel />
      )}
      {gitPanelVisible && activeSession?.type === "terminal" && (
        <GitPanel />
      )}
      {gitDiffPanelVisible && activeSession?.type === "terminal" && (
        <GitDiffPanel />
      )}
      {editorVisible && activeSession?.type === "terminal" && (
        <EditorPanel />
      )}

      {/* Terminal / Settings content area */}
      <div className="relative flex-1">
        {sessionsList.map((session) => (
          <div
            key={session.id}
            className={`absolute inset-0 ${
              session.id === activeSessionId ? "visible" : "invisible"
            }`}
          >
            {session.type === "terminal" ? (
              hasLayout(session.id) ? (
                <SplitPaneContainer rootSessionId={session.id} />
              ) : (
                <XTerminal
                  sessionId={session.id}
                  isRootActive={session.id === activeSessionId}
                />
              )
            ) : (
              <SettingsContainer />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
