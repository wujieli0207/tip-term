import { useEffect } from "react";
import { useSessionStore } from "../stores/sessionStore";
import { useFileTreeStore } from "../stores/fileTreeStore";
import { useEditorStore } from "../stores/editorStore";
import { useQuickOpenStore } from "../stores/quickOpenStore";
import { useSettingsStore } from "../stores/settingsStore";
import { getEffectiveHotkeys, bindingsMatch, eventToBinding } from "../utils/hotkeyUtils";

// Map of action names to their handler functions
type ActionHandlers = Record<string, () => void>;

export function useHotkeyHandler() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Convert event to binding
      const pressedBinding = eventToBinding(e);
      if (!pressedBinding) return;

      // Get current hotkey configuration
      const { hotkeys } = useSettingsStore.getState();
      const effectiveHotkeys = getEffectiveHotkeys(hotkeys.customizations);

      // Find matching hotkey (skip disabled hotkeys with null binding)
      const matchedHotkey = effectiveHotkeys.find(
        (h) => h.currentBinding && bindingsMatch(h.currentBinding, pressedBinding)
      );

      if (!matchedHotkey) return;

      // Get stores
      const sessionStore = useSessionStore.getState();
      const editorStore = useEditorStore.getState();
      const fileTreeStore = useFileTreeStore.getState();
      const quickOpenStore = useQuickOpenStore.getState();

      // Define action handlers
      const handlers: ActionHandlers = {
        openSettings: () => {
          sessionStore.openSettings();
        },
        quickOpen: () => {
          quickOpenStore.open();
        },
        newSession: () => {
          sessionStore.createSession().catch(console.error);
        },
        closeSession: () => {
          // Check if focus is in editor area (CodeMirror)
          const isEditorFocused = document.activeElement?.closest(".cm-editor") !== null;

          if (editorStore.editorVisible && editorStore.activeFilePath && isEditorFocused) {
            // Close active editor tab
            editorStore.closeActiveFile();
          } else if (
            sessionStore.activeSessionId &&
            !sessionStore.isSettingsSession(sessionStore.activeSessionId)
          ) {
            sessionStore.closeSession(sessionStore.activeSessionId).catch(console.error);
          }
        },
        toggleSidebar: () => {
          sessionStore.toggleSidebar();
        },
        toggleFileTree: () => {
          fileTreeStore.toggleFileTreeVisible();
        },
        toggleEditor: () => {
          editorStore.toggleEditorVisible();
        },
        saveFile: () => {
          if (editorStore.editorVisible && editorStore.activeFilePath) {
            editorStore.saveActiveFile().catch((error) => {
              console.error("Failed to save file:", error);
            });
          }
        },
        switchSession1: () => switchToSession(0),
        switchSession2: () => switchToSession(1),
        switchSession3: () => switchToSession(2),
        switchSession4: () => switchToSession(3),
        switchSession5: () => switchToSession(4),
        switchSession6: () => switchToSession(5),
        switchSession7: () => switchToSession(6),
        switchSession8: () => switchToSession(7),
        switchSession9: () => switchToSession(8),
      };

      // Helper function for session switching
      function switchToSession(index: number) {
        const sessions = sessionStore.getTerminalSessions();
        if (index < sessions.length) {
          sessionStore.setActiveSession(sessions[index].id);
        }
      }

      // Execute the action handler
      const handler = handlers[matchedHotkey.action];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
