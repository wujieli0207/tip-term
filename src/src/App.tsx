import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionStore } from "./stores/sessionStore";
import { useFileTreeStore } from "./stores/fileTreeStore";
import { useEditorStore } from "./stores/editorStore";
import Sidebar from "./components/sidebar/Sidebar";
import TerminalContainer from "./components/terminal/TerminalContainer";
import { isShellProcess, sendNotification } from "./utils/notifications";

interface ProcessInfo {
  name: string;
  cwd: string;
}

function App() {
  // Track previous process names for command completion detection
  const previousProcesses = useRef<Map<string, string>>(new Map());

  // Create initial session on mount
  useEffect(() => {
    useSessionStore.getState().createSession().catch(console.error);
  }, []);

  // Poll session process info (only for terminal sessions)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const { getTerminalSessions, updateSessionProcessInfo, activeSessionId } = useSessionStore.getState();
      const sessions = getTerminalSessions();

      // Poll each session's process info
      for (const session of sessions) {
        try {
          const info = await invoke<ProcessInfo | null>("get_session_info", { id: session.id });
          if (info) {
            const previousProcess = previousProcesses.current.get(session.id);
            const currentProcess = info.name;

            // Check for command completion: non-shell -> shell transition
            if (
              session.notifyWhenDone &&
              session.id !== activeSessionId &&
              previousProcess &&
              !isShellProcess(previousProcess) &&
              isShellProcess(currentProcess)
            ) {
              await sendNotification({
                title: "Command Completed",
                body: `"${previousProcess}" finished`,
                sessionId: session.id,
              });
            }

            // Update previous process tracking
            previousProcesses.current.set(session.id, currentProcess);

            updateSessionProcessInfo(session.id, info.name, info.cwd);
          }
        } catch (error) {
          console.error(`[App] Failed to get process info for ${session.id}:`, error);
        }
      }

      // Clean up tracking for deleted sessions
      const sessionIds = new Set(sessions.map((s) => s.id));
      for (const id of previousProcesses.current.keys()) {
        if (!sessionIds.has(id)) {
          previousProcesses.current.delete(id);
        }
      }
    }, 1500); // Poll every 1.5 seconds

    return () => clearInterval(pollInterval);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { activeSessionId, createSession, closeSession, toggleSidebar, getTerminalSessions, setActiveSession, openSettings, isSettingsSession } = useSessionStore.getState();

      // Cmd+,: Open settings
      if (e.metaKey && e.key === ",") {
        e.preventDefault();
        openSettings();
        return;
      }

      // Cmd+T: New session
      if (e.metaKey && e.key === "t") {
        e.preventDefault();
        createSession().catch(console.error);
        return;
      }

      // Cmd+W: Close active editor tab if editor is focused, else close terminal session
      if (e.metaKey && e.key === "w") {
        e.preventDefault();
        const editorStore = useEditorStore.getState();

        // Check if focus is in editor area (CodeMirror)
        const isEditorFocused = document.activeElement?.closest('.cm-editor') !== null;

        if (editorStore.editorVisible && editorStore.activeFilePath && isEditorFocused) {
          // Close active editor tab
          editorStore.closeActiveFile();
        } else if (activeSessionId && !isSettingsSession(activeSessionId)) {
          closeSession(activeSessionId).catch(console.error);
        }
        return;
      }

      // Cmd+\: Toggle sidebar
      if (e.metaKey && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Cmd+B: Toggle file tree
      if (e.metaKey && e.key === "b") {
        e.preventDefault();
        useFileTreeStore.getState().toggleFileTreeVisible();
        return;
      }

      // Cmd+E: Toggle editor panel
      if (e.metaKey && e.key === "e") {
        e.preventDefault();
        useEditorStore.getState().toggleEditorVisible();
        return;
      }

      // Cmd+S: Save active file in editor
      if (e.metaKey && e.key === "s") {
        e.preventDefault();
        const editorStore = useEditorStore.getState();
        if (editorStore.editorVisible && editorStore.activeFilePath) {
          editorStore.saveActiveFile().catch((error) => {
            console.error("Failed to save file:", error);
          });
        }
        return;
      }

      // Cmd+1-9: Switch to terminal session by index
      if (e.metaKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const sessions = getTerminalSessions();
        if (index < sessions.length) {
          setActiveSession(sessions[index].id);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar />
      <TerminalContainer />
    </div>
  );
}

export default App;
