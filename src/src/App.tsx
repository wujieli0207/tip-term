import { useEffect } from "react";
import { useSessionStore } from "./stores/sessionStore";
import Sidebar from "./components/sidebar/Sidebar";
import TerminalContainer from "./components/terminal/TerminalContainer";

function App() {
  // Create initial session on mount
  useEffect(() => {
    useSessionStore.getState().createSession().catch(console.error);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    console.log("[App] Setting up keyboard shortcuts listener");

    const handleKeyDown = (e: KeyboardEvent) => {
      const { activeSessionId, createSession, closeSession, toggleSidebar, getSessionsList, setActiveSession, sidebarCollapsed } = useSessionStore.getState();

      // Cmd+T: New session
      if (e.metaKey && e.key === "t") {
        console.log("[App] Cmd+T pressed, creating new session");
        e.preventDefault();
        createSession().catch(console.error);
        return;
      }

      // Cmd+W: Close current session
      if (e.metaKey && e.key === "w") {
        console.log("[App] Cmd+W pressed, activeSessionId:", activeSessionId);
        e.preventDefault();
        if (activeSessionId) {
          closeSession(activeSessionId).catch(console.error);
        }
        return;
      }

      // Cmd+\: Toggle sidebar
      if (e.metaKey && e.key === "\\") {
        console.log("[App] Cmd+\\ pressed, current sidebarCollapsed:", sidebarCollapsed);
        e.preventDefault();
        toggleSidebar();
        console.log("[App] After toggleSidebar, new sidebarCollapsed:", useSessionStore.getState().sidebarCollapsed);
        return;
      }

      // Cmd+1-9: Switch to session by index
      if (e.metaKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const sessions = getSessionsList();
        console.log("[App] Cmd+" + e.key + " pressed, sessions count:", sessions.length);
        if (index < sessions.length) {
          setActiveSession(sessions[index].id);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      console.log("[App] Removing keyboard shortcuts listener");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar />
      <TerminalContainer />
    </div>
  );
}

export default App;
