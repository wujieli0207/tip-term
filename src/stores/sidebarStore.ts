import { create } from "zustand";

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
  width: 220,
  activeTab: 'session',

  toggle: () => {
    set((state) => ({ collapsed: !state.collapsed }));
  },

  setWidth: (width: number) => {
    set({ width: Math.max(160, Math.min(400, width)) });
  },

  setActiveTab: (tab: SidebarTab) => {
    set({ activeTab: tab });
  },
}));
