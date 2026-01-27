import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { FileEntry } from "../types/file";

export interface DirectoryTree {
  rootPath: string;
  entries: Map<string, FileEntry[]>; // path -> children
  expandedPaths: Set<string>;
  isLoading: boolean;
  error: string | null;
}

interface FileTreeStore {
  // State
  fileTreeWidth: number;
  sessionTrees: Map<string, DirectoryTree>;

  // Actions
  setFileTreeWidth: (width: number) => void;
  loadDirectory: (sessionId: string, path: string) => Promise<void>;
  toggleDirectory: (sessionId: string, path: string) => void;
  initSessionTree: (sessionId: string, rootPath: string) => void;
  clearSessionTree: (sessionId: string) => void;
  refreshDirectory: (sessionId: string, path: string) => Promise<void>;
  refreshRoot: (sessionId: string, newRootPath: string) => Promise<void>;
}

const DEFAULT_FILE_TREE_WIDTH = 250;

export const useFileTreeStore = create<FileTreeStore>((set, get) => ({
  fileTreeWidth: DEFAULT_FILE_TREE_WIDTH,
  sessionTrees: new Map(),

  setFileTreeWidth: (width: number) => {
    set({ fileTreeWidth: Math.max(150, Math.min(500, width)) });
  },

  initSessionTree: (sessionId: string, rootPath: string) => {
    set((state) => {
      const newTrees = new Map(state.sessionTrees);
      const existingTree = newTrees.get(sessionId);

      // If already initialized with same root, don't reset
      if (existingTree && existingTree.rootPath === rootPath) {
        return state;
      }

      // Root path changed - create new tree and trigger load
      newTrees.set(sessionId, {
        rootPath,
        entries: new Map(),
        expandedPaths: new Set([rootPath]),
        isLoading: false,
        error: null,
      });

      // Schedule loading the new root directory
      setTimeout(() => get().loadDirectory(sessionId, rootPath), 0);

      return { sessionTrees: newTrees };
    });
  },

  clearSessionTree: (sessionId: string) => {
    set((state) => {
      const newTrees = new Map(state.sessionTrees);
      newTrees.delete(sessionId);
      return { sessionTrees: newTrees };
    });
  },

  loadDirectory: async (sessionId: string, path: string) => {
    const state = get();
    const tree = state.sessionTrees.get(sessionId);
    if (!tree) return;

    // Skip if already loaded
    if (tree.entries.has(path)) return;

    // Set loading state
    set((state) => {
      const newTrees = new Map(state.sessionTrees);
      const currentTree = newTrees.get(sessionId);
      if (currentTree) {
        newTrees.set(sessionId, { ...currentTree, isLoading: true, error: null });
      }
      return { sessionTrees: newTrees };
    });

    try {
      const entries = await invoke<FileEntry[]>("read_directory", {
        path,
        excludePatterns: null,
        showHidden: false,
      });

      set((state) => {
        const newTrees = new Map(state.sessionTrees);
        const currentTree = newTrees.get(sessionId);
        if (currentTree) {
          const newEntries = new Map(currentTree.entries);
          newEntries.set(path, entries);
          newTrees.set(sessionId, {
            ...currentTree,
            entries: newEntries,
            isLoading: false,
          });
        }
        return { sessionTrees: newTrees };
      });
    } catch (error) {
      set((state) => {
        const newTrees = new Map(state.sessionTrees);
        const currentTree = newTrees.get(sessionId);
        if (currentTree) {
          newTrees.set(sessionId, {
            ...currentTree,
            isLoading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        return { sessionTrees: newTrees };
      });
    }
  },

  toggleDirectory: (sessionId: string, path: string) => {
    set((state) => {
      const newTrees = new Map(state.sessionTrees);
      const tree = newTrees.get(sessionId);
      if (!tree) return state;

      const newExpandedPaths = new Set(tree.expandedPaths);
      if (newExpandedPaths.has(path)) {
        newExpandedPaths.delete(path);
      } else {
        newExpandedPaths.add(path);
        // Load directory if not yet loaded
        setTimeout(() => get().loadDirectory(sessionId, path), 0);
      }

      newTrees.set(sessionId, {
        ...tree,
        expandedPaths: newExpandedPaths,
      });

      return { sessionTrees: newTrees };
    });
  },

  refreshDirectory: async (sessionId: string, path: string) => {
    // Clear cached entries for this path and reload
    set((state) => {
      const newTrees = new Map(state.sessionTrees);
      const tree = newTrees.get(sessionId);
      if (tree) {
        const newEntries = new Map(tree.entries);
        newEntries.delete(path);
        newTrees.set(sessionId, { ...tree, entries: newEntries });
      }
      return { sessionTrees: newTrees };
    });

    await get().loadDirectory(sessionId, path);
  },

  refreshRoot: async (sessionId: string, newRootPath: string) => {
    // Force reset the tree with new root path and reload
    set((state) => {
      const newTrees = new Map(state.sessionTrees);
      newTrees.set(sessionId, {
        rootPath: newRootPath,
        entries: new Map(),
        expandedPaths: new Set([newRootPath]),
        isLoading: true,
        error: null,
      });
      return { sessionTrees: newTrees };
    });

    await get().loadDirectory(sessionId, newRootPath);
  },
}));
