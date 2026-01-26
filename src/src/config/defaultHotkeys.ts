import { HotkeyDefinition, HotkeyBinding } from "../types/hotkey";

// Helper to create binding
function binding(key: string, ...modifiers: HotkeyDefinition["defaultBinding"]["modifiers"]): HotkeyBinding {
  return { key, modifiers };
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
  {
    id: "switchSession1",
    action: "switchSession",
    label: "Switch to Session 1",
    description: "Switch to the first terminal session",
    scope: "global",
    defaultBinding: binding("1", "meta"),
    category: "Session",
  },
  {
    id: "switchSession2",
    action: "switchSession",
    label: "Switch to Session 2",
    description: "Switch to the second terminal session",
    scope: "global",
    defaultBinding: binding("2", "meta"),
    category: "Session",
  },
  {
    id: "switchSession3",
    action: "switchSession",
    label: "Switch to Session 3",
    description: "Switch to the third terminal session",
    scope: "global",
    defaultBinding: binding("3", "meta"),
    category: "Session",
  },
  {
    id: "switchSession4",
    action: "switchSession",
    label: "Switch to Session 4",
    description: "Switch to the fourth terminal session",
    scope: "global",
    defaultBinding: binding("4", "meta"),
    category: "Session",
  },
  {
    id: "switchSession5",
    action: "switchSession",
    label: "Switch to Session 5",
    description: "Switch to the fifth terminal session",
    scope: "global",
    defaultBinding: binding("5", "meta"),
    category: "Session",
  },
  {
    id: "switchSession6",
    action: "switchSession",
    label: "Switch to Session 6",
    description: "Switch to the sixth terminal session",
    scope: "global",
    defaultBinding: binding("6", "meta"),
    category: "Session",
  },
  {
    id: "switchSession7",
    action: "switchSession",
    label: "Switch to Session 7",
    description: "Switch to the seventh terminal session",
    scope: "global",
    defaultBinding: binding("7", "meta"),
    category: "Session",
  },
  {
    id: "switchSession8",
    action: "switchSession",
    label: "Switch to Session 8",
    description: "Switch to the eighth terminal session",
    scope: "global",
    defaultBinding: binding("8", "meta"),
    category: "Session",
  },
  {
    id: "switchSession9",
    action: "switchSession",
    label: "Switch to Session 9",
    description: "Switch to the ninth terminal session",
    scope: "global",
    defaultBinding: binding("9", "meta"),
    category: "Session",
  },

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
];

// Get all unique categories in order
export const HOTKEY_CATEGORIES = [...new Set(DEFAULT_HOTKEYS.map((h) => h.category))];
