import { useEffect } from "react";
import { useSessionStore } from "./stores/sessionStore";
import { TitleBar } from "./components/titlebar";
import Sidebar from "./components/sidebar/Sidebar";
import DetailPanelsContainer from "./components/sidebar/DetailPanelsContainer";
import TerminalContainer from "./components/terminal/TerminalContainer";
import QuickOpenModal from "./components/quickopen/QuickOpenModal";
import { useHotkeyHandler } from "./hooks/useHotkeyHandler";
import { useProcessPolling } from "./hooks/useProcessPolling";

function App() {
  // Create initial session on mount
  useEffect(() => {
    useSessionStore.getState().createSession().catch(console.error);
  }, []);

  useProcessPolling();

  // Global keyboard shortcuts (handled by useHotkeyHandler hook)
  useHotkeyHandler();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <DetailPanelsContainer />
        <TerminalContainer />
      </div>
      <QuickOpenModal />
    </div>
  );
}

export default App;
