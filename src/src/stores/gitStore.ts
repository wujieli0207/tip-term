import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import {
  GitStatus,
  FileDiff,
  CommitInfo,
  CommitResult,
  SessionGitState,
  FileStatus,
} from "../types/git";

interface GitStore {
  // Panel visibility
  gitPanelVisible: boolean;
  gitPanelWidth: number;

  // Diff panel visibility
  gitDiffPanelVisible: boolean;
  gitDiffPanelWidth: number;

  // Per-session git state
  sessionGitState: Map<string, SessionGitState>;

  // Section collapse state
  stagedExpanded: boolean;
  changedExpanded: boolean;
  untrackedExpanded: boolean;

  // Diff viewer state
  selectedFilePath: string | null;
  selectedFileStaged: boolean;
  fileDiff: FileDiff | null;
  isDiffLoading: boolean;

  // Commit state
  commitMessage: string;
  isCommitting: boolean;

  // Recent commits
  recentCommits: CommitInfo[];

  // Actions
  toggleGitPanel: () => void;
  setGitPanelWidth: (width: number) => void;
  toggleGitDiffPanel: () => void;
  setGitDiffPanelWidth: (width: number) => void;

  toggleStaged: () => void;
  toggleChanged: () => void;
  toggleUntracked: () => void;

  loadGitStatus: (sessionId: string, repoPath: string) => Promise<void>;
  clearSessionGitState: (sessionId: string) => void;

  stageFile: (sessionId: string, filePath: string) => Promise<void>;
  unstageFile: (sessionId: string, filePath: string) => Promise<void>;
  stageAll: (sessionId: string) => Promise<void>;
  unstageAll: (sessionId: string) => Promise<void>;
  discardChanges: (sessionId: string, filePath: string) => Promise<void>;

  selectFile: (
    filePath: string,
    staged: boolean,
    sessionId: string,
    fileStatus: FileStatus["status"],
  ) => Promise<void>;
  clearSelectedFile: () => void;

  setCommitMessage: (message: string) => void;
  commit: (sessionId: string) => Promise<CommitResult>;
  commitAndPush: (sessionId: string) => Promise<CommitResult>;

  loadRecentCommits: (sessionId: string) => Promise<void>;
}

const DEFAULT_GIT_PANEL_WIDTH = 300;
const DEFAULT_GIT_DIFF_PANEL_WIDTH = 400;

export const useGitStore = create<GitStore>((set, get) => ({
  // Initial state
  gitPanelVisible: false,
  gitPanelWidth: DEFAULT_GIT_PANEL_WIDTH,
  gitDiffPanelVisible: false,
  gitDiffPanelWidth: DEFAULT_GIT_DIFF_PANEL_WIDTH,
  sessionGitState: new Map(),
  stagedExpanded: true,
  changedExpanded: true,
  untrackedExpanded: true,
  selectedFilePath: null,
  selectedFileStaged: false,
  fileDiff: null,
  isDiffLoading: false,
  commitMessage: "",
  isCommitting: false,
  recentCommits: [],

  toggleGitPanel: () => {
    set((state) => ({ gitPanelVisible: !state.gitPanelVisible }));
  },

  setGitPanelWidth: (width: number) => {
    set({ gitPanelWidth: Math.max(250, Math.min(500, width)) });
  },

  toggleGitDiffPanel: () => {
    set((state) => ({ gitDiffPanelVisible: !state.gitDiffPanelVisible }));
  },

  setGitDiffPanelWidth: (width: number) => {
    set({ gitDiffPanelWidth: Math.max(300, Math.min(600, width)) });
  },

  toggleStaged: () => set((state) => ({ stagedExpanded: !state.stagedExpanded })),
  toggleChanged: () => set((state) => ({ changedExpanded: !state.changedExpanded })),
  toggleUntracked: () => set((state) => ({ untrackedExpanded: !state.untrackedExpanded })),

  loadGitStatus: async (sessionId: string, repoPath: string) => {
    // Set loading state
    set((state) => {
      const newState = new Map(state.sessionGitState);
      newState.set(sessionId, {
        repoPath,
        status: null,
        isLoading: true,
        error: null,
      });
      return { sessionGitState: newState };
    });

    try {
      const status = await invoke<GitStatus>("get_git_status", { path: repoPath });

      set((state) => {
        const newState = new Map(state.sessionGitState);
        newState.set(sessionId, {
          repoPath,
          status,
          isLoading: false,
          error: null,
        });
        return { sessionGitState: newState };
      });

      // Also load recent commits
      get().loadRecentCommits(sessionId);
    } catch (error) {
      set((state) => {
        const newState = new Map(state.sessionGitState);
        newState.set(sessionId, {
          repoPath,
          status: null,
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
        });
        return { sessionGitState: newState };
      });
    }
  },

  clearSessionGitState: (sessionId: string) => {
    set((state) => {
      const newState = new Map(state.sessionGitState);
      newState.delete(sessionId);
      return { sessionGitState: newState };
    });
  },

  stageFile: async (sessionId: string, filePath: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    try {
      await invoke("stage_file", { repoPath: gitState.repoPath, filePath });
      await get().loadGitStatus(sessionId, gitState.repoPath);
    } catch (error) {
      console.error("Failed to stage file:", error);
    }
  },

  unstageFile: async (sessionId: string, filePath: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    try {
      await invoke("unstage_file", { repoPath: gitState.repoPath, filePath });
      await get().loadGitStatus(sessionId, gitState.repoPath);
    } catch (error) {
      console.error("Failed to unstage file:", error);
    }
  },

  stageAll: async (sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    try {
      await invoke("stage_all", { repoPath: gitState.repoPath });
      await get().loadGitStatus(sessionId, gitState.repoPath);
    } catch (error) {
      console.error("Failed to stage all:", error);
    }
  },

  unstageAll: async (sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    try {
      await invoke("unstage_all", { repoPath: gitState.repoPath });
      await get().loadGitStatus(sessionId, gitState.repoPath);
    } catch (error) {
      console.error("Failed to unstage all:", error);
    }
  },

  discardChanges: async (sessionId: string, filePath: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    try {
      await invoke("discard_changes", { repoPath: gitState.repoPath, filePath });
      await get().loadGitStatus(sessionId, gitState.repoPath);
    } catch (error) {
      console.error("Failed to discard changes:", error);
    }
  },

  selectFile: async (
    filePath: string,
    staged: boolean,
    sessionId: string,
    fileStatus: FileStatus["status"],
  ) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    set({
      selectedFilePath: filePath,
      selectedFileStaged: staged,
      isDiffLoading: true,
      gitDiffPanelVisible: true, // Auto-show diff panel
    });

    try {
      const diff = await invoke<FileDiff>("get_file_diff", {
        repoPath: gitState.repoPath,
        filePath,
        staged,
        fileStatus,
      });
      set({ fileDiff: diff, isDiffLoading: false });
    } catch (error) {
      console.error("Failed to load diff:", error);
      set({ fileDiff: null, isDiffLoading: false });
    }
  },

  clearSelectedFile: () => {
    set({ selectedFilePath: null, fileDiff: null, gitDiffPanelVisible: false });
  },

  setCommitMessage: (message: string) => {
    set({ commitMessage: message });
  },

  commit: async (sessionId: string) => {
    const state = get();
    const gitState = state.sessionGitState.get(sessionId);
    if (!gitState || !state.commitMessage.trim()) {
      return { success: false, error: "No commit message" };
    }

    set({ isCommitting: true });

    try {
      const result = await invoke<CommitResult>("commit", {
        repoPath: gitState.repoPath,
        message: state.commitMessage,
      });

      if (result.success) {
        set({ commitMessage: "", isCommitting: false });
        await get().loadGitStatus(sessionId, gitState.repoPath);
      } else {
        set({ isCommitting: false });
      }

      return result;
    } catch (error) {
      set({ isCommitting: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  commitAndPush: async (sessionId: string) => {
    const state = get();
    const gitState = state.sessionGitState.get(sessionId);
    if (!gitState || !state.commitMessage.trim()) {
      return { success: false, error: "No commit message" };
    }

    set({ isCommitting: true });

    try {
      const result = await invoke<CommitResult>("commit_and_push", {
        repoPath: gitState.repoPath,
        message: state.commitMessage,
        remote: null,
      });

      if (result.success) {
        set({ commitMessage: "", isCommitting: false });
        await get().loadGitStatus(sessionId, gitState.repoPath);
      } else {
        set({ isCommitting: false });
      }

      return result;
    } catch (error) {
      set({ isCommitting: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  loadRecentCommits: async (sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    try {
      const commits = await invoke<CommitInfo[]>("get_recent_commits", {
        repoPath: gitState.repoPath,
        count: 5,
      });
      set({ recentCommits: commits });
    } catch (error) {
      console.error("Failed to load recent commits:", error);
      set({ recentCommits: [] });
    }
  },
}));
