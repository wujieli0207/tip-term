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
import { updateTerminalThemes, updateTerminalCursorSettings } from "./terminal-core/api/terminalApi";
import { reloadTerminalConfig } from "./terminal-core/config/loader";
import { startTerminalConfigWatcher } from "./terminal-core/config/watcher";

function App() {
  const themeServiceInitRef = useRef(false);

  // Initialize theme service, terminal config, and create initial session
  useEffect(() => {
    if (themeServiceInitRef.current) return;
    themeServiceInitRef.current = true;
    let cancelled = false;
    let stopWatcher: (() => void) | null = null;

    const initApp = async () => {
      const themeService = getThemeService();
      await themeService.init();
      themeService.applyThemeFromSettings();

      await reloadTerminalConfig();
      stopWatcher = await startTerminalConfigWatcher();

      if (!cancelled) {
        useSessionStore.getState().createSession().catch(console.error);
      }
    };

    initApp().catch(console.error);

    // Listen for theme mode changes from settings UI
    const handleThemeModeChange = () => {
      const themeService = getThemeService();
      themeService.applyThemeFromSettings();
      updateTerminalThemes();
      reloadTerminalConfig().catch(console.error);
    };

    window.addEventListener('theme-mode-change', handleThemeModeChange);

    return () => {
      cancelled = true;
      stopWatcher?.();
      window.removeEventListener('theme-mode-change', handleThemeModeChange);
    };
  }, []);

  // Subscribe to theme changes
  useEffect(() => {
    const themeService = getThemeService();

    const unsubscribe = themeService.subscribe(() => {
      updateTerminalThemes();
      reloadTerminalConfig().catch(console.error);
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

        // Check if color scheme changed
        if (
          currentAppearance.darkColorScheme !== previousAppearance.darkColorScheme ||
          currentAppearance.lightColorScheme !== previousAppearance.lightColorScheme
        ) {
          updateTerminalThemes();
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
