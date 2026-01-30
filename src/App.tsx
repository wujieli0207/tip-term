import { useEffect, useRef } from "react";
import { useSessionStore } from "./stores/sessionStore";
import { useSettingsStore } from "./stores/settingsStore";
import { TitleBar } from "./components/titlebar";
import Sidebar from "./components/sidebar/Sidebar";
import DetailPanelsContainer from "./components/sidebar/DetailPanelsContainer";
import TerminalContainer from "./components/terminal/TerminalContainer";
import QuickOpenModal from "./components/quickopen/QuickOpenModal";
import { useHotkeyHandler } from "./hooks/useHotkeyHandler";
import { useProcessPolling } from "./hooks/useProcessPolling";
import { getThemeService } from "./services/themeService";
import { updateTerminalThemes, updateTerminalCursorSettings } from "./utils/terminalRegistry";

function App() {
  const themeServiceInitRef = useRef(false);

  // Create initial session on mount
  useEffect(() => {
    useSessionStore.getState().createSession().catch(console.error);
  }, []);

  // Initialize theme service
  useEffect(() => {
    if (themeServiceInitRef.current) return;
    themeServiceInitRef.current = true;

    const initTheme = async () => {
      const themeService = getThemeService();
      await themeService.init();
      themeService.applyThemeFromSettings();
    };

    initTheme().catch(console.error);

    // Listen for theme mode changes from settings UI
    const handleThemeModeChange = () => {
      const themeService = getThemeService();
      themeService.applyThemeFromSettings();
      updateTerminalThemes();
    };

    window.addEventListener('theme-mode-change', handleThemeModeChange);

    return () => {
      window.removeEventListener('theme-mode-change', handleThemeModeChange);
    };
  }, []);

  // Subscribe to theme changes
  useEffect(() => {
    const themeService = getThemeService();

    const unsubscribe = themeService.subscribe(() => {
      // Update terminal themes when theme changes
      updateTerminalThemes();
    });

    return unsubscribe;
  }, []);

  // Subscribe to appearance settings changes
  useEffect(() => {
    let previousAppearance = useSettingsStore.getState().appearance;

    const unsubscribe = useSettingsStore.subscribe(
      (state) => {
        const currentAppearance = state.appearance;
        // Check if cursor settings changed
        if (
          currentAppearance.cursorStyle !== previousAppearance.cursorStyle ||
          currentAppearance.cursorBlink !== previousAppearance.cursorBlink
        ) {
          updateTerminalCursorSettings();
        }
        previousAppearance = currentAppearance;
      }
    );

    return unsubscribe;
  }, []);

  useProcessPolling();

  // Global keyboard shortcuts (handled by useHotkeyHandler hook)
  useHotkeyHandler();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
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
