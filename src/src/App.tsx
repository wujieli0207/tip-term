import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionStore } from "./stores/sessionStore";
import Sidebar from "./components/sidebar/Sidebar";
import TerminalContainer from "./components/terminal/TerminalContainer";

interface ProcessInfo {
  name: string;
  cwd: string;
}

function App() {
  // Create initial session on mount
  useEffect(() => {
    useSessionStore.getState().createSession().catch(console.error);
  }, []);

  // Poll session process info
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const { getSessionsList, updateSessionProcessInfo } = useSessionStore.getState();
      const sessions = getSessionsList();

      // Poll each session's process info
      for (const session of sessions) {
        try {
          const info = await invoke<ProcessInfo | null>("get_session_info", { id: session.id });
          if (info) {
            updateSessionProcessInfo(session.id, info.name, info.cwd);
          }
        } catch (error) {
          console.error(`[App] Failed to get process info for ${session.id}:`, error);
        }
      }
    }, 1500); // Poll every 1.5 seconds

    return () => clearInterval(pollInterval);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { activeSessionId, createSession, closeSession, toggleSidebar, getSessionsList, setActiveSession } = useSessionStore.getState();

      // Cmd+T: New session
      if (e.metaKey && e.key === "t") {
        e.preventDefault();
        createSession().catch(console.error);
        return;
      }

      // Cmd+W: Close current session
      if (e.metaKey && e.key === "w") {
        e.preventDefault();
        if (activeSessionId) {
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

      // Cmd+1-9: Switch to session by index
      if (e.metaKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const sessions = getSessionsList();
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
