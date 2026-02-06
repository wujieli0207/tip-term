import { useSessionStore } from "../../stores/sessionStore";
import { useEffect } from "react";
import { useSplitPaneStore } from "../../stores/splitPaneStore";
import type { PaneNode } from "../../types/splitPane";
import XTerminal from "../XTerminal";
import SplitPaneContainer from "./SplitPaneContainer";
import SettingsContainer from "../settings/SettingsContainer";
import { cleanupTerminals } from "../../terminal-core/api/terminalApi";

export default function TerminalContainer() {
  const {
    getSessionsList,
    getTerminalSessions,
    activeSessionId,
    createSession,
    sessions,
  } = useSessionStore();
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
      <div className="flex-1 flex items-center justify-center bg-bg-terminal">
        <div className="text-center">
          <div className="mb-4 text-text-secondary">No active sessions</div>
          <button
            onClick={() => createSession()}
            className="px-4 py-2 text-text-primary transition-colors bg-accent-primary rounded-lg hover:bg-accent-primary/90 shadow-soft"
          >
            Create New Session
          </button>
          <div className="mt-3 text-sm text-text-muted">
            or press <kbd className="px-1.5 py-0.5 bg-bg-active rounded text-xs text-text-secondary">Cmd+T</kbd>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-bg-terminal">
      {/* Terminal / Settings content area */}
      <div className="relative flex-1">
        {sessionsList.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
          <div
            key={session.id}
            className="absolute inset-0"
            style={{
              // Use left: -9999px for inactive terminals to completely pause xterm rendering
              // This is more effective than visibility:hidden alone
              left: isActive ? 0 : "-9999px",
              visibility: isActive ? "visible" : "hidden",
            }}
          >
            {session.type === "terminal" ? (
              hasLayout(session.id) ? (
                <SplitPaneContainer rootSessionId={session.id} />
              ) : (
                <XTerminal
                  sessionId={session.id}
                  isRootActive={isActive}
                />
              )
            ) : (
              <SettingsContainer />
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}
