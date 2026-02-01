import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import {
  GitStatus,
  FileDiff,
  CommitInfo,
  CommitResult,
  SessionGitState,
  FileStatus,
  BranchStatus,
  CommitDiffResult,
  BranchInfo,
} from "../types/git";

interface GitStore {
  // Panel visibility
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
  selectedFileStatus: FileStatus["status"] | null;
  fileDiff: FileDiff | null;
  isDiffLoading: boolean;

  // Commit state
  commitMessage: string;
  isCommitting: boolean;

  // Push state
  isPushing: boolean;
  branchStatus: BranchStatus | null;

  // Recent commits
  recentCommits: CommitInfo[];

  // Commit diff panel state
  commitDiffPanelVisible: boolean;
  commitDiffPanelWidth: number;
  selectedCommitId: string | null;
  commitDiff: CommitDiffResult | null;
  isCommitDiffLoading: boolean;
  expandedCommitFiles: Set<string>;

  // Branch state
  branches: BranchInfo[];
  isBranchesLoading: boolean;
  branchSwitcherOpen: boolean;
  createBranchModalOpen: boolean;
  isSwitchingBranch: boolean;
  isCreatingBranch: boolean;

  // Actions
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
  push: (sessionId: string) => Promise<{ success: boolean; error?: string }>;

  loadBranchStatus: (sessionId: string) => Promise<void>;
  loadRecentCommits: (sessionId: string, count?: number) => Promise<void>;

  // Commit diff actions
  toggleCommitDiffPanel: () => void;
  setCommitDiffPanelWidth: (width: number) => void;
  selectCommit: (commitId: string, sessionId: string) => Promise<void>;
  clearSelectedCommit: () => void;
  toggleCommitFile: (filePath: string) => void;
  expandAllCommitFiles: () => void;
  collapseAllCommitFiles: () => void;

  // Open file in editor
  openFileInEditor: (filePath: string, sessionId: string) => Promise<void>;
  openCommitFileInEditor: (filePath: string, sessionId: string) => Promise<void>;

  // Branch actions
  loadBranches: (sessionId: string) => Promise<void>;
  switchBranch: (sessionId: string, branchName: string, isRemote: boolean) => Promise<void>;
  createBranch: (sessionId: string, branchName: string, baseBranch: string) => Promise<void>;
  setBranchSwitcherOpen: (open: boolean) => void;
  setCreateBranchModalOpen: (open: boolean) => void;
}

const DEFAULT_GIT_PANEL_WIDTH = 300;
const DEFAULT_GIT_DIFF_PANEL_WIDTH = 400;

export const useGitStore = create<GitStore>((set, get) => ({
  // Initial state
  gitPanelWidth: DEFAULT_GIT_PANEL_WIDTH,
  gitDiffPanelVisible: false,
  gitDiffPanelWidth: DEFAULT_GIT_DIFF_PANEL_WIDTH,
  sessionGitState: new Map(),
  stagedExpanded: true,
  changedExpanded: true,
  untrackedExpanded: true,
  selectedFilePath: null,
  selectedFileStaged: false,
  selectedFileStatus: null,
  fileDiff: null,
  isDiffLoading: false,
  commitMessage: "",
  isCommitting: false,
  isPushing: false,
  branchStatus: null,
  recentCommits: [],
  commitDiffPanelVisible: false,
  commitDiffPanelWidth: DEFAULT_GIT_DIFF_PANEL_WIDTH,
  selectedCommitId: null,
  commitDiff: null,
  isCommitDiffLoading: false,
  expandedCommitFiles: new Set(),
  branches: [],
  isBranchesLoading: false,
  branchSwitcherOpen: false,
  createBranchModalOpen: false,
  isSwitchingBranch: false,
  isCreatingBranch: false,

  toggleGitDiffPanel: () => {
    set((state) => ({ gitDiffPanelVisible: !state.gitDiffPanelVisible }));
  },

  setGitDiffPanelWidth: (width: number) => {
    set({ gitDiffPanelWidth: Math.max(300, Math.min(1400, width)) });
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

      // Also load recent commits and branch status
      get().loadRecentCommits(sessionId);
      get().loadBranchStatus(sessionId);
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
      selectedFileStatus: fileStatus,
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
    set({ selectedFilePath: null, selectedFileStatus: null, fileDiff: null, gitDiffPanelVisible: false });
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

  loadRecentCommits: async (sessionId: string, count?: number) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    try {
      const commits = await invoke<CommitInfo[]>("get_recent_commits", {
        repoPath: gitState.repoPath,
        count: count ?? 50,
      });
      set({ recentCommits: commits });
    } catch (error) {
      console.error("Failed to load recent commits:", error);
      set({ recentCommits: [] });
    }
  },

  loadBranchStatus: async (sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    try {
      const status = await invoke<BranchStatus>("get_branch_status", {
        repoPath: gitState.repoPath,
      });
      set({ branchStatus: status });
    } catch (error) {
      console.error("Failed to load branch status:", error);
      set({ branchStatus: null });
    }
  },

  push: async (sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) {
      return { success: false, error: "No git state" };
    }

    set({ isPushing: true });

    try {
      await invoke("git_push", {
        repoPath: gitState.repoPath,
        remote: null,
      });

      set({ isPushing: false });

      // Reload status and commits after push
      await get().loadGitStatus(sessionId, gitState.repoPath);

      return { success: true };
    } catch (error) {
      set({ isPushing: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Commit diff actions
  toggleCommitDiffPanel: () => {
    set((state) => ({ commitDiffPanelVisible: !state.commitDiffPanelVisible }));
  },

  setCommitDiffPanelWidth: (width: number) => {
    set({ commitDiffPanelWidth: Math.max(300, Math.min(800, width)) });
  },

  selectCommit: async (commitId: string, sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    // Clear file diff panel and show commit diff panel
    set({
      selectedCommitId: commitId,
      isCommitDiffLoading: true,
      commitDiffPanelVisible: true,
      gitDiffPanelVisible: false, // Hide file diff panel
      expandedCommitFiles: new Set(), // Reset expanded files
    });

    try {
      const diff = await invoke<CommitDiffResult>("get_commit_diff", {
        repoPath: gitState.repoPath,
        commitId,
      });

      // Auto-expand files if there are 5 or fewer
      const autoExpand = diff.fileDiffs.length <= 5;
      const expandedFiles: Set<string> = autoExpand
        ? new Set(diff.fileDiffs.map((f) => f.path))
        : new Set();

      set({
        commitDiff: diff,
        isCommitDiffLoading: false,
        expandedCommitFiles: expandedFiles,
      });
    } catch (error) {
      console.error("Failed to load commit diff:", error);
      set({
        commitDiff: null,
        isCommitDiffLoading: false,
        selectedCommitId: null,
        commitDiffPanelVisible: false,
      });
    }
  },

  clearSelectedCommit: () => {
    set({
      selectedCommitId: null,
      commitDiff: null,
      commitDiffPanelVisible: false,
      expandedCommitFiles: new Set(),
    });
  },

  toggleCommitFile: (filePath: string) => {
    set((state) => {
      const newSet = new Set(state.expandedCommitFiles);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return { expandedCommitFiles: newSet };
    });
  },

  expandAllCommitFiles: () => {
    set((state) => ({
      expandedCommitFiles: new Set(state.commitDiff?.fileDiffs.map((f) => f.path) ?? []),
    }));
  },

  collapseAllCommitFiles: () => {
    set({ expandedCommitFiles: new Set() });
  },

  openFileInEditor: async (filePath: string, sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    // Build full path to the file
    const { resolve } = await import("@tauri-apps/api/path");
    const fullPath = await resolve(gitState.repoPath, filePath);

    // Import editorStore dynamically to avoid circular dependency
    const { useEditorStore } = await import("./editorStore");
    const editorStore = useEditorStore.getState();

    // Open file in editor
    await editorStore.openFile(fullPath);

    // Close the diff panel
    get().clearSelectedFile();
  },

  openCommitFileInEditor: async (filePath: string, sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    // Build full path to the file
    const { resolve } = await import("@tauri-apps/api/path");
    const fullPath = await resolve(gitState.repoPath, filePath);

    // Import editorStore dynamically to avoid circular dependency
    const { useEditorStore } = await import("./editorStore");
    const editorStore = useEditorStore.getState();

    // Open file in editor
    await editorStore.openFile(fullPath);

    // Close the commit diff panel
    get().clearSelectedCommit();
  },

  // Branch actions
  loadBranches: async (sessionId: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    set({ isBranchesLoading: true });

    try {
      const branches = await invoke<BranchInfo[]>("get_branches", {
        repoPath: gitState.repoPath,
      });
      set({ branches, isBranchesLoading: false });
    } catch (error) {
      console.error("Failed to load branches:", error);
      set({ branches: [], isBranchesLoading: false });
    }
  },

  switchBranch: async (sessionId: string, branchName: string, isRemote: boolean) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    set({ isSwitchingBranch: true });

    try {
      await invoke("switch_branch", {
        repoPath: gitState.repoPath,
        branchName,
        isRemote,
      });

      // Close the branch switcher and reload git status
      set({ isSwitchingBranch: false, branchSwitcherOpen: false });
      await get().loadGitStatus(sessionId, gitState.repoPath);
    } catch (error) {
      console.error("Failed to switch branch:", error);
      set({ isSwitchingBranch: false });
      throw error;
    }
  },

  createBranch: async (sessionId: string, branchName: string, baseBranch: string) => {
    const gitState = get().sessionGitState.get(sessionId);
    if (!gitState) return;

    set({ isCreatingBranch: true });

    try {
      await invoke("create_branch", {
        repoPath: gitState.repoPath,
        branchName,
        baseBranch,
      });

      // Close the modals and reload git status
      set({ isCreatingBranch: false, createBranchModalOpen: false, branchSwitcherOpen: false });
      await get().loadGitStatus(sessionId, gitState.repoPath);
    } catch (error) {
      console.error("Failed to create branch:", error);
      set({ isCreatingBranch: false });
      throw error;
    }
  },

  setBranchSwitcherOpen: (open: boolean) => {
    set({ branchSwitcherOpen: open });
  },

  setCreateBranchModalOpen: (open: boolean) => {
    set({ createBranchModalOpen: open });
  },
}));
