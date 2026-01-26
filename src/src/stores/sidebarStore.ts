import { create } from "zustand";

interface SidebarStore {
  collapsed: boolean;
  width: number;
  toggle: () => void;
  setWidth: (width: number) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  collapsed: false,
  width: 220,

  toggle: () => {
    set((state) => ({ collapsed: !state.collapsed }));
  },

  setWidth: (width: number) => {
    set({ width: Math.max(160, Math.min(400, width)) });
  },
}));
