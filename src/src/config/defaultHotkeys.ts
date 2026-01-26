import { HotkeyDefinition, HotkeyBinding } from "../types/hotkey";

// Helper to create binding
function binding(key: string, ...modifiers: HotkeyDefinition["defaultBinding"]["modifiers"]): HotkeyBinding {
  return { key, modifiers };
}

// Ordinal words for session numbers
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];

// Factory for switchSession hotkeys
function createSwitchSessionHotkeys(): Omit<HotkeyDefinition, "currentBinding">[] {
  return Array.from({ length: 9 }, (_, i) => ({
    id: `switchSession${i + 1}`,
    action: "switchSession" as const,
    label: `Switch to Session ${i + 1}`,
    description: `Switch to the ${ORDINALS[i]} terminal session`,
    scope: "global" as const,
    defaultBinding: binding(String(i + 1), "meta"),
    category: "Session" as const,
  }));
}

export const DEFAULT_HOTKEYS: Omit<HotkeyDefinition, "currentBinding">[] = [
  // General
  {
    id: "openSettings",
    action: "openSettings",
    label: "Open Settings",
    description: "Open the settings panel",
    scope: "global",
    defaultBinding: binding(",", "meta"),
    category: "General",
  },
  {
    id: "quickOpen",
    action: "quickOpen",
    label: "Quick Open",
    description: "Open quick file search",
    scope: "global",
    defaultBinding: binding("p", "meta"),
    category: "General",
  },

  // Session
  {
    id: "newSession",
    action: "newSession",
    label: "New Session",
    description: "Create a new terminal session",
    scope: "global",
    defaultBinding: binding("t", "meta"),
    category: "Session",
  },
  {
    id: "closeSession",
    action: "closeSession",
    label: "Close Session",
    description: "Close the active session or editor tab",
    scope: "global",
    defaultBinding: binding("w", "meta"),
    category: "Session",
  },
  ...createSwitchSessionHotkeys(),

  // View
  {
    id: "toggleSidebar",
    action: "toggleSidebar",
    label: "Toggle Sidebar",
    description: "Show or hide the sidebar",
    scope: "global",
    defaultBinding: binding("\\", "meta"),
    category: "View",
  },
  {
    id: "toggleFileTree",
    action: "toggleFileTree",
    label: "Toggle File Tree",
    description: "Show or hide the file tree panel",
    scope: "global",
    defaultBinding: binding("b", "meta"),
    category: "View",
  },
  {
    id: "toggleEditor",
    action: "toggleEditor",
    label: "Toggle Editor",
    description: "Show or hide the editor panel",
    scope: "global",
    defaultBinding: binding("e", "meta"),
    category: "View",
  },

  // Editor
  {
    id: "saveFile",
    action: "saveFile",
    label: "Save File",
    description: "Save the active file in editor",
    scope: "editor",
    defaultBinding: binding("s", "meta"),
    category: "Editor",
  },

  // Split Pane
  {
    id: "splitVertical",
    action: "splitVertical",
    label: "Split Vertical",
    description: "Split the current pane horizontally (new terminal on right)",
    scope: "terminal",
    defaultBinding: binding("d", "meta"),
    category: "Split Pane",
  },
  {
    id: "splitHorizontal",
    action: "splitHorizontal",
    label: "Split Horizontal",
    description: "Split the current pane vertically (new terminal below)",
    scope: "terminal",
    defaultBinding: binding("d", "meta", "shift"),
    category: "Split Pane",
  },
  {
    id: "navigatePaneUp",
    action: "navigatePaneUp",
    label: "Navigate Pane Up",
    description: "Move focus to the pane above",
    scope: "terminal",
    defaultBinding: binding("ArrowUp", "meta", "alt"),
    category: "Split Pane",
  },
  {
    id: "navigatePaneDown",
    action: "navigatePaneDown",
    label: "Navigate Pane Down",
    description: "Move focus to the pane below",
    scope: "terminal",
    defaultBinding: binding("ArrowDown", "meta", "alt"),
    category: "Split Pane",
  },
  {
    id: "navigatePaneLeft",
    action: "navigatePaneLeft",
    label: "Navigate Pane Left",
    description: "Move focus to the pane on the left",
    scope: "terminal",
    defaultBinding: binding("ArrowLeft", "meta", "alt"),
    category: "Split Pane",
  },
  {
    id: "navigatePaneRight",
    action: "navigatePaneRight",
    label: "Navigate Pane Right",
    description: "Move focus to the pane on the right",
    scope: "terminal",
    defaultBinding: binding("ArrowRight", "meta", "alt"),
    category: "Split Pane",
  },
];

// Get all unique categories in order
export const HOTKEY_CATEGORIES = [...new Set(DEFAULT_HOTKEYS.map((h) => h.category))];
