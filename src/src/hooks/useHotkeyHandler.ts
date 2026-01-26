import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionStore } from "../stores/sessionStore";
import { useSidebarStore } from "../stores/sidebarStore";
import { useFileTreeStore } from "../stores/fileTreeStore";
import { useEditorStore } from "../stores/editorStore";
import { useQuickOpenStore } from "../stores/quickOpenStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useSplitPaneStore } from "../stores/splitPaneStore";
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
      const sidebarStore = useSidebarStore.getState();
      const editorStore = useEditorStore.getState();
      const fileTreeStore = useFileTreeStore.getState();
      const quickOpenStore = useQuickOpenStore.getState();
      const splitPaneStore = useSplitPaneStore.getState();

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
            const rootSessionId = sessionStore.activeSessionId;
            const layout = splitPaneStore.getLayout(rootSessionId);

            if (layout) {
              // Close the focused pane
              const paneSessionId = splitPaneStore.closePane(rootSessionId, layout.focusedPaneId);
              if (paneSessionId) {
                // Close the PTY session for the closed pane
                invoke("close_session", { id: paneSessionId }).catch(console.error);
              }

              // Check if layout was removed (last pane closed)
              if (!splitPaneStore.hasLayout(rootSessionId)) {
                // Close the root session (tab)
                sessionStore.closeSession(rootSessionId).catch(console.error);
              }
            } else {
              // No split layout, close the session directly
              sessionStore.closeSession(rootSessionId).catch(console.error);
            }
          }
        },
        toggleSidebar: () => {
          sidebarStore.toggle();
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
        switchSession: () => {
          const index = getSwitchSessionIndex(matchedHotkey.id);
          if (index !== null) {
            switchToSession(index);
          }
        },

        // Split Pane handlers
        splitVertical: () => {
          if (!sessionStore.activeSessionId) return;
          if (sessionStore.isSettingsSession(sessionStore.activeSessionId)) return;

          const rootSessionId = sessionStore.activeSessionId;

          // Create a new PTY session for the new pane
          invoke<string>("create_session", { shell: "/bin/zsh" })
            .then((newSessionId) => {
              const layout = splitPaneStore.getLayout(rootSessionId);

              if (!layout) {
                // Initialize layout for the first split
                splitPaneStore.initLayout(rootSessionId, rootSessionId);
                const newLayout = splitPaneStore.getLayout(rootSessionId);
                if (newLayout) {
                  splitPaneStore.splitPane(
                    rootSessionId,
                    newLayout.focusedPaneId,
                    "horizontal", // horizontal = vertical split visually (side by side)
                    newSessionId
                  );
                }
              } else {
                // Split the focused pane
                splitPaneStore.splitPane(
                  rootSessionId,
                  layout.focusedPaneId,
                  "horizontal",
                  newSessionId
                );
              }
            })
            .catch(console.error);
        },

        splitHorizontal: () => {
          if (!sessionStore.activeSessionId) return;
          if (sessionStore.isSettingsSession(sessionStore.activeSessionId)) return;

          const rootSessionId = sessionStore.activeSessionId;

          // Create a new PTY session for the new pane
          invoke<string>("create_session", { shell: "/bin/zsh" })
            .then((newSessionId) => {
              const layout = splitPaneStore.getLayout(rootSessionId);

              if (!layout) {
                // Initialize layout for the first split
                splitPaneStore.initLayout(rootSessionId, rootSessionId);
                const newLayout = splitPaneStore.getLayout(rootSessionId);
                if (newLayout) {
                  splitPaneStore.splitPane(
                    rootSessionId,
                    newLayout.focusedPaneId,
                    "vertical", // vertical = horizontal split visually (stacked)
                    newSessionId
                  );
                }
              } else {
                // Split the focused pane
                splitPaneStore.splitPane(
                  rootSessionId,
                  layout.focusedPaneId,
                  "vertical",
                  newSessionId
                );
              }
            })
            .catch(console.error);
        },

        navigatePaneUp: () => {
          if (!sessionStore.activeSessionId) return;
          splitPaneStore.navigateFocus(sessionStore.activeSessionId, "up");
        },

        navigatePaneDown: () => {
          if (!sessionStore.activeSessionId) return;
          splitPaneStore.navigateFocus(sessionStore.activeSessionId, "down");
        },

        navigatePaneLeft: () => {
          if (!sessionStore.activeSessionId) return;
          splitPaneStore.navigateFocus(sessionStore.activeSessionId, "left");
        },

        navigatePaneRight: () => {
          if (!sessionStore.activeSessionId) return;
          splitPaneStore.navigateFocus(sessionStore.activeSessionId, "right");
        },
      };

      // Helper function for session switching
      function switchToSession(index: number) {
        const sessions = sessionStore.getTerminalSessions();
        if (index < sessions.length) {
          sessionStore.setActiveSession(sessions[index].id);
        }
      }

      function getSwitchSessionIndex(id: string): number | null {
        const match = id.match(/^switchSession(\d+)$/);
        if (!match) return null;
        const index = Number(match[1]);
        if (!Number.isInteger(index) || index < 1) return null;
        return index - 1;
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
