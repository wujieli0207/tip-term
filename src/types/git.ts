export interface FileStatus {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "untracked";
  oldPath?: string;
}

export interface GitStatus {
  branchName: string;
  isDetached: boolean;
  stagedFiles: FileStatus[];
  changedFiles: FileStatus[];
  untrackedFiles: FileStatus[];
}

export interface DiffLine {
  origin: string;
  content: string;
  oldLineno?: number;
  newLineno?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  hunks: DiffHunk[];
}

export interface FileDiffWithStats {
  path: string;
  oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied";
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface CommitDiffResult {
  commitId: string;
  commitMessage: string;
  commitAuthor: string;
  commitTime: number;
  fileDiffs: FileDiffWithStats[];
  isInitialCommit: boolean;
}

export interface CommitInfo {
  id: string;
  shortId: string;
  message: string;
  author: string;
  time: number;
  timeRelative: string;
  isPushed: boolean;
}

export interface BranchStatus {
  ahead: number;
  behind: number;
  remoteBranch: string | null;
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  remoteName?: string;
}

export interface CommitResult {
  success: boolean;
  commitId?: string;
  error?: string;
}

// Per-session git state
export interface SessionGitState {
  repoPath: string;
  status: GitStatus | null;
  isLoading: boolean;
  error: string | null;
}
