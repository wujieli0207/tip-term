import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  is_hidden: boolean;
  match_type: "prefix" | "contains";
}

interface QuickOpenStore {
  isOpen: boolean;
  query: string;
  results: FileEntry[];
  selectedIndex: number;
  isLoading: boolean;

  // Actions
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  search: (rootPath: string) => Promise<void>;
  moveSelection: (direction: "up" | "down") => void;
  getSelectedFile: () => FileEntry | null;
  reset: () => void;
}

export const useQuickOpenStore = create<QuickOpenStore>((set, get) => ({
  isOpen: false,
  query: "",
  results: [],
  selectedIndex: 0,
  isLoading: false,

  open: () => {
    set({ isOpen: true, query: "", results: [], selectedIndex: 0 });
  },

  close: () => {
    set({ isOpen: false, query: "", results: [], selectedIndex: 0 });
  },

  setQuery: (query: string) => {
    set({ query, selectedIndex: 0 });
  },

  search: async (rootPath: string) => {
    const { query } = get();
    if (!query.trim()) {
      set({ results: [], isLoading: false });
      return;
    }

    set({ isLoading: true });

    try {
      const results = await invoke<FileEntry[]>("search_files", {
        rootPath,
        query: query.trim(),
        maxResults: 50,
      });

      set({ results, isLoading: false, selectedIndex: 0 });
    } catch (error) {
      console.error("Search failed:", error);
      set({ results: [], isLoading: false });
    }
  },

  moveSelection: (direction: "up" | "down") => {
    set((state) => {
      const { results, selectedIndex } = state;
      if (results.length === 0) return state;

      let newIndex: number;
      if (direction === "up") {
        newIndex = selectedIndex <= 0 ? results.length - 1 : selectedIndex - 1;
      } else {
        newIndex = selectedIndex >= results.length - 1 ? 0 : selectedIndex + 1;
      }

      return { selectedIndex: newIndex };
    });
  },

  getSelectedFile: () => {
    const { results, selectedIndex } = get();
    return results[selectedIndex] || null;
  },

  reset: () => {
    set({ isOpen: false, query: "", results: [], selectedIndex: 0, isLoading: false });
  },
}));
