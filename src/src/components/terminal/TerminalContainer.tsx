import { useSessionStore } from "../../stores/sessionStore";
import { useFileTreeStore } from "../../stores/fileTreeStore";
import { useEditorStore } from "../../stores/editorStore";
import { useSplitPaneStore } from "../../stores/splitPaneStore";
import XTerminal from "../XTerminal";
import SplitPaneContainer from "./SplitPaneContainer";
import SettingsContainer from "../settings/SettingsContainer";
import FileTreePanel from "../filetree/FileTreePanel";
import EditorPanel from "../editor/EditorPanel";

export default function TerminalContainer() {
  const { getSessionsList, getTerminalSessions, activeSessionId, createSession, sessions } = useSessionStore();
  const { fileTreeVisible } = useFileTreeStore();
  const { editorVisible } = useEditorStore();
  const hasLayout = useSplitPaneStore((state) => state.hasLayout);
  const sessionsList = getSessionsList();
  const terminalSessions = getTerminalSessions();

  // Get active session to check if it's a terminal
  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;

  // Show empty state if no terminal sessions and settings is not active
  if (terminalSessions.length === 0 && activeSession?.type !== "settings") {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="text-gray-500 mb-4">No active sessions</div>
          <button
            onClick={() => createSession()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Create New Session
          </button>
          <div className="mt-3 text-gray-600 text-sm">
            or press <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-xs">Cmd+T</kbd>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-[#0a0a0a]">
      {/* File tree panel - only shown for terminal sessions */}
      {fileTreeVisible && activeSession?.type === "terminal" && (
        <FileTreePanel />
      )}

      {/* Editor panel - shown for terminal sessions when visible */}
      {editorVisible && activeSession?.type === "terminal" && (
        <EditorPanel />
      )}

      {/* Terminal / Settings content area */}
      <div className="flex-1 relative">
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
                <XTerminal sessionId={session.id} />
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
