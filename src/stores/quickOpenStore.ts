import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { SearchFileEntry } from "../types/file";
import { HotkeyDefinition, HotkeyBinding } from "../types/hotkey";
import { getEffectiveHotkeys } from "../utils/hotkeyUtils";

type FilterType = "all" | "files" | "hotkeys";

export type RecentItemType = "file" | "hotkey";

export interface RecentItem {
  type: RecentItemType;
  label: string;           // Display name (file name or hotkey label)
  filePath?: string;       // Full file path for files
  hotkeyId?: string;       // Hotkey id for hotkeys
  binding?: HotkeyBinding; // Keyboard binding for hotkeys
  description?: string;    // Description for hotkeys
}

interface QuickOpenStore {
  isOpen: boolean;
  query: string;
  results: SearchFileEntry[];
  selectedIndex: number;
  isLoading: boolean;
  filterType: FilterType;
  recentSearches: RecentItem[];
  hotkeyResults: HotkeyDefinition[];
  hotkeySelectedIndex: number;

  // Actions
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  setFilterType: (filterType: FilterType) => void;
  search: (rootPath: string) => Promise<void>;
  searchHotkeys: (query: string) => void;
  moveSelection: (direction: "up" | "down") => void;
  getSelectedFile: () => SearchFileEntry | null;
  getSelectedHotkey: () => HotkeyDefinition | null;
  addRecentFile: (filePath: string, fileName: string) => void;
  addRecentHotkey: (hotkey: HotkeyDefinition) => void;
  reset: () => void;
}

const MAX_RECENT_SEARCHES = 10;

export const useQuickOpenStore = create<QuickOpenStore>((set, get) => ({
  isOpen: false,
  query: "",
  results: [],
  selectedIndex: 0,
  isLoading: false,
  filterType: "all",
  recentSearches: [],
  hotkeyResults: [],
  hotkeySelectedIndex: 0,

  open: () => {
    set({ isOpen: true, query: "", results: [], selectedIndex: 0, hotkeyResults: [], hotkeySelectedIndex: 0 });
  },

  close: () => {
    set({ isOpen: false, query: "", results: [], selectedIndex: 0, hotkeyResults: [], hotkeySelectedIndex: 0 });
  },

  setQuery: (query: string) => {
    set({ query, selectedIndex: 0, hotkeySelectedIndex: 0 });
  },

  setFilterType: (filterType: FilterType) => {
    set({ filterType, selectedIndex: 0, hotkeySelectedIndex: 0 });
  },

  search: async (rootPath: string) => {
    const { query, filterType } = get();
    if (!query.trim()) {
      set({ results: [], hotkeyResults: [], isLoading: false });
      return;
    }

    set({ isLoading: true });

    // Search files if filter type is 'all' or 'files'
    if (filterType === "all" || filterType === "files") {
      try {
        const results = await invoke<SearchFileEntry[]>("search_files", {
          rootPath,
          query: query.trim(),
          maxResults: 50,
        });
        set({ results, isLoading: false, selectedIndex: 0 });
      } catch (error) {
        console.error("Search failed:", error);
        set({ results: [], isLoading: false });
      }
    } else {
      set({ results: [], isLoading: false });
    }
  },

  searchHotkeys: (query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      set({ hotkeyResults: [] });
      return;
    }

    const effectiveHotkeys = getEffectiveHotkeys({});
    const filtered = effectiveHotkeys.filter((h) => {
      if (!h.currentBinding) return false;
      return (
        h.label.toLowerCase().includes(trimmedQuery) ||
        h.description.toLowerCase().includes(trimmedQuery) ||
        h.category.toLowerCase().includes(trimmedQuery)
      );
    });

    set({ hotkeyResults: filtered, hotkeySelectedIndex: 0 });
  },

  moveSelection: (direction: "up" | "down") => {
    set((state) => {
      const { results, selectedIndex, hotkeyResults, hotkeySelectedIndex, filterType } = state;

      // Calculate total items based on filter type
      let fileCount = filterType === "hotkeys" ? 0 : results.length;
      let hotkeyCount = filterType === "files" ? 0 : hotkeyResults.length;

      // When query is empty, only recent searches are shown
      if (!state.query.trim()) {
        return state;
      }

      const totalItems = fileCount + hotkeyCount;
      if (totalItems === 0) return state;

      // Current global selection
      const currentFileSelected = selectedIndex < fileCount && fileCount > 0;
      let currentGlobalIndex: number;

      if (filterType === "all") {
        // In "all" mode, files come first, then hotkeys
        if (currentFileSelected) {
          currentGlobalIndex = selectedIndex;
        } else {
          currentGlobalIndex = fileCount + hotkeySelectedIndex;
        }
      } else if (filterType === "files") {
        currentGlobalIndex = selectedIndex;
      } else {
        currentGlobalIndex = hotkeySelectedIndex;
      }

      let newIndex: number;
      if (direction === "up") {
        newIndex = currentGlobalIndex <= 0 ? totalItems - 1 : currentGlobalIndex - 1;
      } else {
        newIndex = currentGlobalIndex >= totalItems - 1 ? 0 : currentGlobalIndex + 1;
      }

      // Map global index back to file/hotkey selection
      if (filterType === "all") {
        if (newIndex < fileCount) {
          return { selectedIndex: newIndex };
        } else {
          return { hotkeySelectedIndex: newIndex - fileCount, selectedIndex: 0 };
        }
      } else if (filterType === "files") {
        return { selectedIndex: newIndex };
      } else {
        return { hotkeySelectedIndex: newIndex };
      }
    });
  },

  getSelectedFile: () => {
    const { results, selectedIndex, filterType } = get();
    if (filterType === "hotkeys") return null;
    return results[selectedIndex] || null;
  },

  getSelectedHotkey: () => {
    const { hotkeyResults, hotkeySelectedIndex, filterType } = get();
    if (filterType === "files") return null;
    return hotkeyResults[hotkeySelectedIndex] || null;
  },

  addRecentFile: (filePath: string, fileName: string) => {
    set((state) => {
      const newItem: RecentItem = {
        type: "file",
        label: fileName,
        filePath,
      };
      const filtered = state.recentSearches.filter(
        (s) => !(s.type === "file" && s.filePath === filePath)
      );
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      return { recentSearches: updated };
    });
  },

  addRecentHotkey: (hotkey: HotkeyDefinition) => {
    set((state) => {
      const newItem: RecentItem = {
        type: "hotkey",
        label: hotkey.label,
        hotkeyId: hotkey.id,
        binding: hotkey.currentBinding || undefined,
        description: hotkey.description,
      };
      const filtered = state.recentSearches.filter(
        (s) => !(s.type === "hotkey" && s.hotkeyId === hotkey.id)
      );
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      return { recentSearches: updated };
    });
  },

  reset: () => {
    set({
      isOpen: false,
      query: "",
      results: [],
      selectedIndex: 0,
      isLoading: false,
      hotkeyResults: [],
      hotkeySelectedIndex: 0,
    });
  },
}));
