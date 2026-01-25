import { useEffect } from "react";
import { useSessionStore } from "../stores/sessionStore";
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
      const editorStore = useEditorStore.getState();
      const fileTreeStore = useFileTreeStore.getState();
      const quickOpenStore = useQuickOpenStore.getState();
      const splitPaneStore = useSplitPaneStore.getState();

      // Helper function for split pane operations - creates PTY in current session
      async function splitPane(direction: "vertical" | "horizontal") {
        const sessionId = sessionStore.activeSessionId;
        if (!sessionId) return;

        const session = sessionStore.sessions.get(sessionId);
        if (!session || session.type !== "terminal") return;

        // Check nesting level limit
        if (splitPaneStore.getNestingLevel(sessionId) >= 4) {
          console.warn("Maximum split nesting level reached (4)");
          return;
        }

        const focusedPaneId = splitPaneStore.getFocusedPaneForSession(sessionId);
        const layoutTree = splitPaneStore.getLayoutForSession(sessionId);

        if (!focusedPaneId || !layoutTree) {
          // No layout yet - initialize with existing PTY and then split
          const existingPtyId = session.ptyIds[0];
          if (!existingPtyId) return;

          splitPaneStore.initializeLayout(sessionId, existingPtyId);

          // Create a new PTY in the current session (not a new session)
          try {
            const newPtyId = await sessionStore.createPtyInSession(sessionId);
            // Need to re-get the state after initialization
            const newState = useSplitPaneStore.getState();
            const newFocusedPaneId = newState.getFocusedPaneForSession(sessionId);
            if (newFocusedPaneId) {
              newState.splitPane(sessionId, newFocusedPaneId, direction, newPtyId);
            }
          } catch (error) {
            console.error("Failed to create PTY for split:", error);
          }
          return;
        }

        // Create a new PTY in the current session and split
        try {
          const newPtyId = await sessionStore.createPtyInSession(sessionId);
          splitPaneStore.splitPane(sessionId, focusedPaneId, direction, newPtyId);
        } catch (error) {
          console.error("Failed to create PTY for split:", error);
        }
      }

      // Helper function to close pane with split awareness
      async function closePaneOrSession() {
        const sessionId = sessionStore.activeSessionId;
        if (!sessionId) return;

        const session = sessionStore.sessions.get(sessionId);
        if (!session) return;

        // Check if focus is in editor area (CodeMirror)
        const isEditorFocused = document.activeElement?.closest(".cm-editor") !== null;

        if (editorStore.editorVisible && editorStore.activeFilePath && isEditorFocused) {
          // Close active editor tab
          editorStore.closeActiveFile();
          return;
        }

        // Don't close settings session with Cmd+W
        if (sessionStore.isSettingsSession(sessionId)) {
          return;
        }

        const focusedPaneId = splitPaneStore.getFocusedPaneForSession(sessionId);
        const layoutTree = splitPaneStore.getLayoutForSession(sessionId);

        // If we have a split layout with a focused pane
        if (layoutTree && focusedPaneId) {
          // Close the focused pane
          const result = splitPaneStore.closePane(sessionId, focusedPaneId);

          if (result) {
            // If last pane, close session directly to avoid double-closing PTY
            const newLayout = splitPaneStore.getLayoutForSession(sessionId);
            if (!newLayout) {
              await sessionStore.closeSession(sessionId);
            } else {
              // Close the PTY that was in this pane
              await sessionStore.closePty(sessionId, result.removedPtyId);
            }
          }
          return;
        }

        // Fallback: close the entire session (single pane case)
        await sessionStore.closeSession(sessionId);
      }

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
          closePaneOrSession().catch(console.error);
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

        // Split pane actions
        splitVertical: () => {
          splitPane("vertical").catch(console.error);
        },
        splitHorizontal: () => {
          splitPane("horizontal").catch(console.error);
        },
        focusPaneUp: () => {
          const sessionId = sessionStore.activeSessionId;
          if (!sessionId) return;
          splitPaneStore.moveFocus(sessionId, "up");
          // No need to sync active session - we're within the same session
        },
        focusPaneDown: () => {
          const sessionId = sessionStore.activeSessionId;
          if (!sessionId) return;
          splitPaneStore.moveFocus(sessionId, "down");
        },
        focusPaneLeft: () => {
          const sessionId = sessionStore.activeSessionId;
          if (!sessionId) return;
          splitPaneStore.moveFocus(sessionId, "left");
        },
        focusPaneRight: () => {
          const sessionId = sessionStore.activeSessionId;
          if (!sessionId) return;
          splitPaneStore.moveFocus(sessionId, "right");
        },
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
