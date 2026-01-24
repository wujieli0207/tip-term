import { useSessionStore } from "../../stores/sessionStore";
import XTerminal from "../XTerminal";

export default function TerminalContainer() {
  const { getSessionsList, activeSessionId, createSession, sidebarCollapsed } = useSessionStore();
  const sessions = getSessionsList();

  console.log("[TerminalContainer] Render:", {
    sessionsCount: sessions.length,
    activeSessionId,
    sidebarCollapsed,
  });

  // Show empty state if no sessions
  if (sessions.length === 0) {
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
    <div className="flex-1 relative bg-[#0a0a0a]">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={`absolute inset-0 ${
            session.id === activeSessionId ? "visible" : "invisible"
          }`}
        >
          <XTerminal sessionId={session.id} />
        </div>
      ))}
    </div>
  );
}
