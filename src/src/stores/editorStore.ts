import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface EditorFile {
  path: string;
  filename: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

interface EditorStore {
  // State
  editorVisible: boolean;
  editorWidth: number;
  openFiles: Map<string, EditorFile>;
  activeFilePath: string | null;
  loadingFilePath: string | null;

  // Actions
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  saveFile: (path: string) => Promise<void>;
  saveActiveFile: () => Promise<void>;
  closeActiveFile: () => void;
  updateFileContent: (path: string, content: string) => void;
  setActiveFile: (path: string) => void;
  toggleEditorVisible: () => void;
  setEditorVisible: (visible: boolean) => void;
  setEditorWidth: (width: number) => void;
  hasUnsavedChanges: () => boolean;
  getActiveFile: () => EditorFile | null;
}

const DEFAULT_EDITOR_WIDTH = 500;

// Request ID for cancellation mechanism
let currentRequestId = 0;

// File size limit for warning (1MB)
const WARNING_FILE_SIZE = 1 * 1024 * 1024;

// Detect language from file extension
function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    mjs: "javascript",
    cjs: "javascript",

    // Python
    py: "python",
    pyw: "python",

    // Rust
    rs: "rust",

    // Go
    go: "go",

    // Config files
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",

    // Web
    html: "html",
    htm: "html",
    css: "css",
    scss: "css",
    sass: "css",

    // Shell
    sh: "shell",
    bash: "shell",
    zsh: "shell",

    // Markdown
    md: "markdown",
    mdx: "markdown",

    // Others
    xml: "xml",
    sql: "sql",
  };

  return languageMap[ext] || "text";
}

// Extract filename from path
function extractFilename(path: string): string {
  return path.split("/").pop() || path;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  editorVisible: false,
  editorWidth: DEFAULT_EDITOR_WIDTH,
  openFiles: new Map(),
  activeFilePath: null,
  loadingFilePath: null,

  toggleEditorVisible: () => {
    set((state) => ({ editorVisible: !state.editorVisible }));
  },

  setEditorVisible: (visible: boolean) => {
    if (!visible) {
      // Cancel any pending file load when hiding editor
      currentRequestId++;
    }
    set({ editorVisible: visible, loadingFilePath: visible ? get().loadingFilePath : null });
  },

  setEditorWidth: (width: number) => {
    set({ editorWidth: Math.max(300, Math.min(800, width)) });
  },

  openFile: async (path: string) => {
    const state = get();

    // If file is already open, just make it active
    if (state.openFiles.has(path)) {
      set({ activeFilePath: path, editorVisible: true, loadingFilePath: null });
      return;
    }

    // Skip if already loading this file
    if (state.loadingFilePath === path) {
      return;
    }

    // Generate new request ID and set loading state
    const requestId = ++currentRequestId;
    set({ loadingFilePath: path });

    try {
      const content = await invoke<string>("read_file", { path });

      // Check if request was cancelled
      if (currentRequestId !== requestId) {
        return;
      }

      // Check file size for warning
      if (content.length > WARNING_FILE_SIZE) {
        console.warn(`File ${path} is large (${content.length} bytes), performance may be affected`);
      }

      const filename = extractFilename(path);
      const language = detectLanguage(filename);

      set((state) => {
        const newFiles = new Map(state.openFiles);
        newFiles.set(path, {
          path,
          filename,
          content,
          originalContent: content,
          isDirty: false,
          language,
        });
        return {
          openFiles: newFiles,
          activeFilePath: path,
          editorVisible: true,
          loadingFilePath: null,
        };
      });
    } catch (error) {
      // Only handle error if request wasn't cancelled
      if (currentRequestId === requestId) {
        set({ loadingFilePath: null });
        console.error("Failed to open file:", error);
        throw error;
      }
    }
  },

  closeFile: (path: string) => {
    set((state) => {
      const newFiles = new Map(state.openFiles);
      newFiles.delete(path);

      // If closing active file, switch to another open file
      let newActiveFilePath = state.activeFilePath;
      if (state.activeFilePath === path) {
        const remainingPaths = Array.from(newFiles.keys());
        newActiveFilePath = remainingPaths.length > 0 ? remainingPaths[remainingPaths.length - 1] : null;
      }

      // If no files left, hide editor
      const editorVisible = newFiles.size > 0 ? state.editorVisible : false;

      return {
        openFiles: newFiles,
        activeFilePath: newActiveFilePath,
        editorVisible,
      };
    });
  },

  saveFile: async (path: string) => {
    const state = get();
    const file = state.openFiles.get(path);
    if (!file) return;

    try {
      await invoke("write_file", { path, content: file.content });

      set((state) => {
        const newFiles = new Map(state.openFiles);
        const currentFile = newFiles.get(path);
        if (currentFile) {
          newFiles.set(path, {
            ...currentFile,
            originalContent: currentFile.content,
            isDirty: false,
          });
        }
        return { openFiles: newFiles };
      });
    } catch (error) {
      console.error("Failed to save file:", error);
      throw error;
    }
  },

  saveActiveFile: async () => {
    const state = get();
    if (state.activeFilePath) {
      await state.saveFile(state.activeFilePath);
    }
  },

  closeActiveFile: () => {
    const state = get();
    if (state.activeFilePath) {
      const file = state.openFiles.get(state.activeFilePath);
      // If file has unsaved changes, confirm before closing
      if (file?.isDirty) {
        if (!confirm(`"${file.filename}" has unsaved changes. Close anyway?`)) {
          return;
        }
      }
      get().closeFile(state.activeFilePath);
    }
  },

  updateFileContent: (path: string, content: string) => {
    set((state) => {
      const newFiles = new Map(state.openFiles);
      const file = newFiles.get(path);
      if (file) {
        newFiles.set(path, {
          ...file,
          content,
          isDirty: content !== file.originalContent,
        });
      }
      return { openFiles: newFiles };
    });
  },

  setActiveFile: (path: string) => {
    set({ activeFilePath: path });
  },

  hasUnsavedChanges: () => {
    const state = get();
    for (const file of state.openFiles.values()) {
      if (file.isDirty) return true;
    }
    return false;
  },

  getActiveFile: () => {
    const state = get();
    if (!state.activeFilePath) return null;
    return state.openFiles.get(state.activeFilePath) || null;
  },
}));
