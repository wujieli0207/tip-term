import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSessionStore } from "../../stores/sessionStore";
import { useFileTreeStore } from "../../stores/fileTreeStore";
import { useEditorStore } from "../../stores/editorStore";
import { useSplitPaneStore } from "../../stores/splitPaneStore";
import XTerminal from "../XTerminal";
import SettingsContainer from "../settings/SettingsContainer";
import FileTreePanel from "../filetree/FileTreePanel";
import EditorPanel from "../editor/EditorPanel";
import { SplitPaneContainer } from "../splitpane";

// A terminal wrapper that can be moved between containers without remounting
interface TerminalWrapperProps {
  ptyId: string;
  isActive: boolean;
  hasLayout: boolean;
  fallbackElement: HTMLElement | null;
}

function TerminalWrapper({ ptyId, isActive, hasLayout, fallbackElement }: TerminalWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Subscribe to paneElements changes and compute paneInfo
  const paneInfo = useSplitPaneStore((state) => {
    for (const info of state.paneElements.values()) {
      if (info.ptyId === ptyId) {
        return info;
      }
    }
    return null;
  });

  const shouldShow = hasLayout ? Boolean(paneInfo?.element) : isActive;

  const content = (
    <div
      ref={containerRef}
      data-terminal-wrapper={ptyId}
      className="absolute inset-0"
      style={{
        visibility: shouldShow ? "visible" : "hidden",
        pointerEvents: shouldShow ? "auto" : "none",
      }}
    >
      <XTerminal sessionId={ptyId} />
    </div>
  );

  const portalTarget = paneInfo?.element ?? fallbackElement;
  if (!portalTarget) return null;

  return createPortal(content, portalTarget);
}

export default function TerminalContainer() {
  const { getTerminalSessions, activeSessionId, createSession, sessions, getSessionPtys } = useSessionStore();
  const { fileTreeVisible } = useFileTreeStore();
  const { editorVisible } = useEditorStore();
  const splitPaneStore = useSplitPaneStore();
  const terminalSessions = getTerminalSessions();
  const [terminalPoolElement, setTerminalPoolElement] = useState<HTMLDivElement | null>(null);
  const terminalPoolRef = useCallback((node: HTMLDivElement | null) => {
    setTerminalPoolElement(node);
  }, []);

  // Get active session to check if it's a terminal
  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;

  // Get layout for the active session
  const layoutTree = activeSessionId ? splitPaneStore.getLayoutForSession(activeSessionId) : null;

  // Get all PTYs for the active session
  const activePtyIds = activeSessionId ? getSessionPtys(activeSessionId) : [];

  // Layout initialization is now handled synchronously in sessionStore.setActiveSession
  // to ensure proper focus management timing

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

  // Check if settings is active
  const isSettingsActive = activeSession?.type === "settings";

  // Collect all PTYs from all terminal sessions for rendering
  const allPtyIds = terminalSessions.flatMap((session) => session.ptyIds);

  return (
    <div className="flex-1 flex bg-[#0a0a0a]">
      {/* File tree panel - only shown for terminal sessions */}
      {fileTreeVisible && !isSettingsActive && (
        <FileTreePanel />
      )}

      {/* Editor panel - shown for terminal sessions when visible */}
      {editorVisible && !isSettingsActive && (
        <EditorPanel />
      )}

      {/* Terminal / Settings content area */}
      <div className="flex-1 relative">
        {/* Settings panel (absolute positioned overlay when active) */}
        {isSettingsActive && (
          <div className="absolute inset-0 z-10">
            <SettingsContainer />
          </div>
        )}

        {/* Split pane layout structure for active session */}
        {!isSettingsActive && layoutTree && activeSessionId && (
          <SplitPaneContainer sessionId={activeSessionId} />
        )}

        {/* Terminal pool - ALL terminals are always rendered here with stable keys */}
        {/* They get moved into panes via DOM manipulation when in split mode */}
        <div
          ref={terminalPoolRef}
          className="absolute inset-0"
          style={{
            zIndex: layoutTree ? -1 : 0,
            visibility: isSettingsActive ? "hidden" : "visible"
          }}
        >
          {allPtyIds.map((ptyId) => (
            <TerminalWrapper
              key={ptyId}
              ptyId={ptyId}
              isActive={activePtyIds.includes(ptyId) && activePtyIds.length === 1}
              hasLayout={layoutTree !== null && activePtyIds.includes(ptyId)}
              fallbackElement={terminalPoolElement}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
