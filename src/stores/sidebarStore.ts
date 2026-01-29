import { create } from "zustand";

const STORAGE_KEY = "tipterm-sidebar-width";

export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_DEFAULT_WIDTH = 220;

// Load saved width from localStorage
function getInitialWidth(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (!isNaN(width)) {
        return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width));
      }
    }
  } catch {
    // Ignore storage errors
  }
  return SIDEBAR_DEFAULT_WIDTH;
}

export type SidebarTab = 'session' | 'filetree' | 'git';

interface SidebarStore {
  collapsed: boolean;
  width: number;
  activeTab: SidebarTab;
  toggle: () => void;
  setWidth: (width: number) => void;
  setActiveTab: (tab: SidebarTab) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  collapsed: false,
  width: getInitialWidth(),
  activeTab: 'session',

  toggle: () => {
    set((state) => ({ collapsed: !state.collapsed }));
  },

  setWidth: (width: number) => {
    const clampedWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width));
    set({ width: clampedWidth });
    try {
      localStorage.setItem(STORAGE_KEY, String(clampedWidth));
    } catch {
      // Ignore storage errors
    }
  },

  setActiveTab: (tab: SidebarTab) => {
    set({ activeTab: tab });
  },
}));
