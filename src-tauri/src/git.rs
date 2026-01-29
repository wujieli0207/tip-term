use git2::{
    DiffOptions, IndexAddOption, Repository, ResetType, Signature, StatusOptions,
};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String, // "added" | "modified" | "deleted" | "renamed" | "untracked"
    pub old_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch_name: String,
    pub is_detached: bool,
    pub staged_files: Vec<FileStatus>,
    pub changed_files: Vec<FileStatus>,
    pub untracked_files: Vec<FileStatus>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffLine {
    pub origin: char,
    pub content: String,
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffHunk {
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileDiff {
    pub path: String,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileDiffWithStats {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String, // "added" | "modified" | "deleted" | "renamed"
    pub additions: usize,
    pub deletions: usize,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitDiffResult {
    pub commit_id: String,
    pub commit_message: String,
    pub commit_author: String,
    pub commit_time: i64,
    pub file_diffs: Vec<FileDiffWithStats>,
    pub is_initial_commit: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub id: String,
    pub short_id: String,
    pub message: String,
    pub author: String,
    pub time: i64,
    pub time_relative: String,
    pub is_pushed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchStatus {
    pub ahead: usize,
    pub behind: usize,
    pub remote_branch: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitResult {
    pub success: bool,
    pub commit_id: Option<String>,
    pub error: Option<String>,
}

fn relative_time(timestamp: i64) -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let diff = now - timestamp;

    if diff < 60 {
        "just now".to_string()
    } else if diff < 3600 {
        let mins = diff / 60;
        format!("{} minute{} ago", mins, if mins == 1 { "" } else { "s" })
    } else if diff < 86400 {
        let hours = diff / 3600;
        format!("{} hour{} ago", hours, if hours == 1 { "" } else { "s" })
    } else if diff < 604800 {
        let days = diff / 86400;
        format!("{} day{} ago", days, if days == 1 { "" } else { "s" })
    } else if diff < 2592000 {
        let weeks = diff / 604800;
        format!("{} week{} ago", weeks, if weeks == 1 { "" } else { "s" })
    } else if diff < 31536000 {
        let months = diff / 2592000;
        format!("{} month{} ago", months, if months == 1 { "" } else { "s" })
    } else {
        let years = diff / 31536000;
        format!("{} year{} ago", years, if years == 1 { "" } else { "s" })
    }
}

/// Get the git status for a repository
#[tauri::command]
pub fn get_git_status(path: String) -> Result<GitStatus, String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    // Get branch name
    let (branch_name, is_detached) = if repo.head_detached().unwrap_or(false) {
        let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
        let commit = head.peel_to_commit().map_err(|e| format!("Failed to get commit: {}", e))?;
        (commit.id().to_string()[..7].to_string(), true)
    } else {
        match repo.head() {
            Ok(head) => {
                let name = head
                    .shorthand()
                    .unwrap_or("unknown")
                    .to_string();
                (name, false)
            }
            Err(_) => ("(no branch)".to_string(), false),
        }
    };

    let mut staged_files = Vec::new();
    let mut changed_files = Vec::new();
    let mut untracked_files = Vec::new();

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get status: {}", e))?;

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let status = entry.status();

        // Check for staged changes (index vs HEAD)
        if status.is_index_new() {
            staged_files.push(FileStatus {
                path: path.clone(),
                status: "added".to_string(),
                old_path: None,
            });
        } else if status.is_index_modified() {
            staged_files.push(FileStatus {
                path: path.clone(),
                status: "modified".to_string(),
                old_path: None,
            });
        } else if status.is_index_deleted() {
            staged_files.push(FileStatus {
                path: path.clone(),
                status: "deleted".to_string(),
                old_path: None,
            });
        } else if status.is_index_renamed() {
            staged_files.push(FileStatus {
                path: path.clone(),
                status: "renamed".to_string(),
                old_path: entry.head_to_index().and_then(|d| d.old_file().path()).map(|p| p.to_string_lossy().to_string()),
            });
        }

        // Check for unstaged changes (worktree vs index)
        if status.is_wt_modified() {
            changed_files.push(FileStatus {
                path: path.clone(),
                status: "modified".to_string(),
                old_path: None,
            });
        } else if status.is_wt_deleted() {
            changed_files.push(FileStatus {
                path: path.clone(),
                status: "deleted".to_string(),
                old_path: None,
            });
        } else if status.is_wt_renamed() {
            changed_files.push(FileStatus {
                path: path.clone(),
                status: "renamed".to_string(),
                old_path: entry.index_to_workdir().and_then(|d| d.old_file().path()).map(|p| p.to_string_lossy().to_string()),
            });
        }

        // Untracked files
        if status.is_wt_new() {
            untracked_files.push(FileStatus {
                path: path.clone(),
                status: "untracked".to_string(),
                old_path: None,
            });
        }
    }

    Ok(GitStatus {
        branch_name,
        is_detached,
        staged_files,
        changed_files,
        untracked_files,
    })
}

/// Stage a single file
#[tauri::command]
pub fn stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;

    // Check if file exists - if not, it's a deletion
    let workdir = repo.workdir().ok_or("No working directory")?;
    let full_path = workdir.join(&file_path);

    if full_path.exists() {
        index
            .add_path(Path::new(&file_path))
            .map_err(|e| format!("Failed to stage file: {}", e))?;
    } else {
        // File was deleted, remove from index
        index
            .remove_path(Path::new(&file_path))
            .map_err(|e| format!("Failed to stage deletion: {}", e))?;
    }

    index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    Ok(())
}

/// Unstage a single file
#[tauri::command]
pub fn unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    // Get HEAD commit (if exists)
    let head_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());

    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;

    if let Some(commit) = head_commit {
        // Reset the file in the index to match HEAD
        let tree = commit.tree().map_err(|e| format!("Failed to get tree: {}", e))?;

        if let Ok(entry) = tree.get_path(Path::new(&file_path)) {
            // File exists in HEAD, restore it
            let obj = entry.to_object(&repo).map_err(|e| format!("Failed to get object: {}", e))?;
            let blob = obj.as_blob().ok_or("Not a blob")?;

            index.add_frombuffer(
                &git2::IndexEntry {
                    ctime: git2::IndexTime::new(0, 0),
                    mtime: git2::IndexTime::new(0, 0),
                    dev: 0,
                    ino: 0,
                    mode: entry.filemode() as u32,
                    uid: 0,
                    gid: 0,
                    file_size: blob.content().len() as u32,
                    id: entry.id(),
                    flags: 0,
                    flags_extended: 0,
                    path: file_path.as_bytes().to_vec(),
                },
                blob.content(),
            ).map_err(|e| format!("Failed to restore file: {}", e))?;
        } else {
            // File doesn't exist in HEAD, remove from index
            index.remove_path(Path::new(&file_path))
                .map_err(|e| format!("Failed to unstage file: {}", e))?;
        }
    } else {
        // No HEAD commit (initial commit scenario), just remove from index
        index.remove_path(Path::new(&file_path))
            .map_err(|e| format!("Failed to unstage file: {}", e))?;
    }

    index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    Ok(())
}

/// Stage all changes
#[tauri::command]
pub fn stage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;

    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to stage all: {}", e))?;

    // Also handle deleted files
    index
        .update_all(["*"].iter(), None)
        .map_err(|e| format!("Failed to update index: {}", e))?;

    index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    Ok(())
}

/// Unstage all files
#[tauri::command]
pub fn unstage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let head = repo.head().ok().and_then(|h| h.peel_to_commit().ok());

    if let Some(commit) = head {
        let obj = commit.into_object();
        repo.reset(&obj, ResetType::Mixed, None)
            .map_err(|e| format!("Failed to unstage all: {}", e))?;
    } else {
        // No HEAD, clear the index entirely
        let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;
        index.clear().map_err(|e| format!("Failed to clear index: {}", e))?;
        index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    }

    Ok(())
}

/// Create a commit
#[tauri::command]
pub fn commit(repo_path: String, message: String) -> Result<CommitResult, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;
    let tree_id = index.write_tree().map_err(|e| format!("Failed to write tree: {}", e))?;
    let tree = repo.find_tree(tree_id).map_err(|e| format!("Failed to find tree: {}", e))?;

    // Get signature from config or use defaults
    let sig = repo.signature().or_else(|_| {
        Signature::now("User", "user@example.com")
    }).map_err(|e| format!("Failed to get signature: {}", e))?;

    // Get parent commit (if exists)
    let parent = repo.head().ok().and_then(|h| h.peel_to_commit().ok());

    let commit_id = if let Some(parent_commit) = parent {
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &message,
            &tree,
            &[&parent_commit],
        )
        .map_err(|e| format!("Failed to create commit: {}", e))?
    } else {
        // Initial commit
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &message,
            &tree,
            &[],
        )
        .map_err(|e| format!("Failed to create initial commit: {}", e))?
    };

    Ok(CommitResult {
        success: true,
        commit_id: Some(commit_id.to_string()),
        error: None,
    })
}

/// Commit and push using shell command (for credential handling)
#[tauri::command]
pub fn commit_and_push(repo_path: String, message: String, remote: Option<String>) -> Result<CommitResult, String> {
    // First, create the commit
    let commit_result = commit(repo_path.clone(), message)?;

    if !commit_result.success {
        return Ok(commit_result);
    }

    // Use shell git push for credential handling
    let remote_name = remote.unwrap_or_else(|| "origin".to_string());

    let output = std::process::Command::new("git")
        .arg("push")
        .arg(&remote_name)
        .arg("HEAD")
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to execute git push: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Ok(CommitResult {
            success: false,
            commit_id: commit_result.commit_id,
            error: Some(format!("Commit succeeded but push failed: {}", stderr)),
        });
    }

    Ok(commit_result)
}

/// Get file diff
#[tauri::command]
pub fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
    file_status: Option<String>,
) -> Result<FileDiff, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let build_content_hunk = |header: &str, content: &[u8], origin: char| -> DiffHunk {
        let mut lines = Vec::new();
        let mut line_no: u32 = 1;
        let content_str = String::from_utf8_lossy(content);

        for segment in content_str.split_inclusive('\n') {
            let (old_lineno, new_lineno) = match origin {
                '+' => (None, Some(line_no)),
                '-' => (Some(line_no), None),
                _ => (None, None),
            };

            lines.push(DiffLine {
                origin,
                content: segment.to_string(),
                old_lineno,
                new_lineno,
            });

            line_no += 1;
        }

        DiffHunk {
            header: header.to_string(),
            lines,
        }
    };

    let status = file_status.unwrap_or_default();
    if status == "added" || status == "untracked" {
        let workdir = repo.workdir().ok_or("No working directory")?;
        let full_path = workdir.join(&file_path);
        let content = std::fs::read(&full_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        let hunk = build_content_hunk("New file", &content, '+');
        return Ok(FileDiff {
            path: file_path,
            hunks: vec![hunk],
        });
    }

    if status == "deleted" {
        let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        let mut hunks = Vec::new();

        if let Some(tree) = head {
            if let Ok(entry) = tree.get_path(Path::new(&file_path)) {
                let obj = entry.to_object(&repo)
                    .map_err(|e| format!("Failed to get object: {}", e))?;
                if let Some(blob) = obj.as_blob() {
                    let hunk = build_content_hunk("Deleted file", blob.content(), '-');
                    hunks.push(hunk);
                }
            }
        }

        if hunks.is_empty() {
            hunks.push(DiffHunk {
                header: "Deleted file".to_string(),
                lines: Vec::new(),
            });
        }

        return Ok(FileDiff {
            path: file_path,
            hunks,
        });
    }

    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(&file_path);

    let diff = if staged {
        // Staged diff: HEAD vs Index
        let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head.as_ref(), None, Some(&mut diff_opts))
            .map_err(|e| format!("Failed to get staged diff: {}", e))?
    } else {
        // Unstaged diff: Index vs Workdir
        repo.diff_index_to_workdir(None, Some(&mut diff_opts))
            .map_err(|e| format!("Failed to get unstaged diff: {}", e))?
    };

    let mut hunks = Vec::new();
    let mut current_hunk: Option<DiffHunk> = None;
    let mut current_hunk_header: Option<String> = None;

    diff.print(git2::DiffFormat::Patch, |_delta, hunk, line| {
        if let Some(hunk_info) = hunk {
            let header = String::from_utf8_lossy(hunk_info.header()).to_string();
            let is_new_hunk = current_hunk_header.as_deref() != Some(header.as_str());

            if is_new_hunk {
                if let Some(h) = current_hunk.take() {
                    hunks.push(h);
                }

                current_hunk_header = Some(header.clone());
                current_hunk = Some(DiffHunk {
                    header,
                    lines: Vec::new(),
                });
            }
        }

        if let Some(ref mut h) = current_hunk {
            let origin = line.origin();

            // Skip hunk header lines and file header lines
            if origin == 'H' || origin == 'F' {
                return true;
            }

            let content = String::from_utf8_lossy(line.content()).to_string();
            let origin_char = match origin {
                '+' => '+',
                '-' => '-',
                ' ' => ' ',
                '>' => '>',
                '<' => '<',
                _ => ' ',
            };

            h.lines.push(DiffLine {
                origin: origin_char,
                content,
                old_lineno: line.old_lineno(),
                new_lineno: line.new_lineno(),
            });
        }

        true
    }).map_err(|e| format!("Failed to print diff: {}", e))?;

    // Don't forget the last hunk
    if let Some(h) = current_hunk {
        hunks.push(h);
    }

    Ok(FileDiff {
        path: file_path,
        hunks,
    })
}

/// Get the remote tracking branch OID for the current branch
fn get_remote_tracking_oid(repo: &Repository) -> Option<git2::Oid> {
    let head = repo.head().ok()?;
    let branch_name = head.shorthand()?;

    // Try common remote patterns
    for remote in ["origin", "upstream"] {
        let remote_ref = format!("refs/remotes/{}/{}", remote, branch_name);
        if let Ok(reference) = repo.find_reference(&remote_ref) {
            return reference.target();
        }
    }

    None
}

/// Get recent commits
#[tauri::command]
pub fn get_recent_commits(repo_path: String, count: Option<usize>) -> Result<Vec<CommitInfo>, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let oid = head.target().ok_or("HEAD has no target")?;

    // Get remote tracking branch OID to determine push status
    let remote_oid = get_remote_tracking_oid(&repo);

    // Collect all OIDs that exist on remote (ancestors of remote tracking branch)
    let mut remote_commits = std::collections::HashSet::new();
    if let Some(remote_oid) = remote_oid {
        let mut revwalk = repo.revwalk().map_err(|e| format!("Failed to create revwalk: {}", e))?;
        revwalk.push(remote_oid).ok();
        for oid_result in revwalk {
            if let Ok(oid) = oid_result {
                remote_commits.insert(oid);
            }
        }
    }

    let mut revwalk = repo.revwalk().map_err(|e| format!("Failed to create revwalk: {}", e))?;
    revwalk.push(oid).map_err(|e| format!("Failed to push oid: {}", e))?;

    let limit = count.unwrap_or(50);
    let mut commits = Vec::new();

    for oid_result in revwalk.take(limit) {
        let oid = oid_result.map_err(|e| format!("Failed to iterate: {}", e))?;
        let commit = repo.find_commit(oid).map_err(|e| format!("Failed to find commit: {}", e))?;

        let id = commit.id().to_string();
        let short_id = id[..7].to_string();
        let message = commit.message().unwrap_or("").lines().next().unwrap_or("").to_string();
        let author = commit.author().name().unwrap_or("Unknown").to_string();
        let time = commit.time().seconds();
        let time_relative = relative_time(time);
        let is_pushed = remote_commits.contains(&oid);

        commits.push(CommitInfo {
            id,
            short_id,
            message,
            author,
            time,
            time_relative,
            is_pushed,
        });
    }

    Ok(commits)
}

/// Discard changes to a file
#[tauri::command]
pub fn discard_changes(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let workdir = repo.workdir().ok_or("No working directory")?;

    // Get the file from HEAD or index
    let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());

    if let Some(tree) = head {
        if let Ok(entry) = tree.get_path(Path::new(&file_path)) {
            // File exists in HEAD, restore it
            let obj = entry.to_object(&repo).map_err(|e| format!("Failed to get object: {}", e))?;
            let blob = obj.as_blob().ok_or("Not a blob")?;

            let full_path = workdir.join(&file_path);
            std::fs::write(&full_path, blob.content())
                .map_err(|e| format!("Failed to restore file: {}", e))?;
        } else {
            // File doesn't exist in HEAD, it's a new file - just delete it
            let full_path = workdir.join(&file_path);
            if full_path.exists() {
                std::fs::remove_file(&full_path)
                    .map_err(|e| format!("Failed to delete file: {}", e))?;
            }
        }
    } else {
        // No HEAD, just delete the file
        let full_path = workdir.join(&file_path);
        if full_path.exists() {
            std::fs::remove_file(&full_path)
                .map_err(|e| format!("Failed to delete file: {}", e))?;
        }
    }

    Ok(())
}

/// Get branch status (ahead/behind counts relative to tracking branch)
#[tauri::command]
pub fn get_branch_status(repo_path: String) -> Result<BranchStatus, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch_name = head.shorthand().unwrap_or("HEAD");

    // Find remote tracking branch
    let mut remote_branch = None;
    let mut remote_oid = None;

    for remote in ["origin", "upstream"] {
        let remote_ref = format!("refs/remotes/{}/{}", remote, branch_name);
        if let Ok(reference) = repo.find_reference(&remote_ref) {
            remote_branch = Some(format!("{}/{}", remote, branch_name));
            remote_oid = reference.target();
            break;
        }
    }

    let head_oid = head.target().ok_or("HEAD has no target")?;

    let (ahead, behind) = if let Some(remote_oid) = remote_oid {
        // Count commits ahead (local commits not on remote)
        let mut ahead_count = 0;
        let mut revwalk = repo.revwalk().map_err(|e| format!("Failed to create revwalk: {}", e))?;
        revwalk.push(head_oid).ok();
        revwalk.hide(remote_oid).ok();
        for _ in revwalk {
            ahead_count += 1;
        }

        // Count commits behind (remote commits not on local)
        let mut behind_count = 0;
        let mut revwalk = repo.revwalk().map_err(|e| format!("Failed to create revwalk: {}", e))?;
        revwalk.push(remote_oid).ok();
        revwalk.hide(head_oid).ok();
        for _ in revwalk {
            behind_count += 1;
        }

        (ahead_count, behind_count)
    } else {
        (0, 0)
    };

    Ok(BranchStatus {
        ahead,
        behind,
        remote_branch,
    })
}

/// Push to remote using shell command (for credential handling)
#[tauri::command]
pub fn git_push(repo_path: String, remote: Option<String>) -> Result<(), String> {
    let remote_name = remote.unwrap_or_else(|| "origin".to_string());

    let output = std::process::Command::new("git")
        .arg("push")
        .arg(&remote_name)
        .arg("HEAD")
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to execute git push: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Push failed: {}", stderr));
    }

    Ok(())
}

/// Get commit diff (diff between a commit and its parent)
#[tauri::command]
pub fn get_commit_diff(repo_path: String, commit_id: String) -> Result<CommitDiffResult, String> {
    let repo = Repository::discover(&repo_path)
        .map_err(|e| format!("Not a git repository: {}", e))?;

    // Parse commit_id string to Oid
    let oid = git2::Oid::from_str(&commit_id)
        .map_err(|e| format!("Invalid commit id: {}", e))?;

    // Find the commit
    let commit = repo.find_commit(oid)
        .map_err(|e| format!("Failed to find commit: {}", e))?;

    // Get commit info
    let commit_id_full = commit.id().to_string();
    let commit_message = commit.message().unwrap_or("").to_string();
    let commit_author = commit.author().name().unwrap_or("Unknown").to_string();
    let commit_time = commit.time().seconds();

    // Check if this is the initial commit (no parents)
    let is_initial_commit = commit.parent_count() == 0;

    // Get the diff
    let diff = if is_initial_commit {
        // For initial commit, diff against empty tree
        let empty_tree_id = git2::Oid::from_str("4b825dc642cb6eb9a060e54bf8d69288fbee4904") // Empty tree hash
            .map_err(|e| format!("Failed to create empty tree oid: {}", e))?;
        let _empty_tree = repo.find_tree(empty_tree_id)
            .map_err(|e| format!("Failed to find empty tree: {}", e))?;
        let commit_tree = commit.tree().map_err(|e| format!("Failed to get commit tree: {}", e))?;
        repo.diff_tree_to_tree(None, Some(&commit_tree), None)
    } else {
        // Diff with parent
        let parent = commit.parent(0)
            .map_err(|e| format!("Failed to get parent commit: {}", e))?;
        let parent_tree = parent.tree().map_err(|e| format!("Failed to get parent tree: {}", e))?;
        let commit_tree = commit.tree().map_err(|e| format!("Failed to get commit tree: {}", e))?;
        repo.diff_tree_to_tree(Some(&parent_tree), Some(&commit_tree), None)
    }.map_err(|e| format!("Failed to create diff: {}", e))?;

    // Parse diff into FileDiffWithStats
    let file_diffs = parse_diff_to_file_diffs(&diff)?;

    Ok(CommitDiffResult {
        commit_id: commit_id_full,
        commit_message,
        commit_author,
        commit_time,
        file_diffs,
        is_initial_commit,
    })
}

/// Parse git2::Diff into Vec<FileDiffWithStats>
fn parse_diff_to_file_diffs(diff: &git2::Diff) -> Result<Vec<FileDiffWithStats>, String> {
    let mut file_diffs = Vec::new();

    for delta in diff.deltas() {
        let old_path = delta.old_file().path().map(|p| p.to_string_lossy().to_string());
        let new_path = delta.new_file().path().map(|p| p.to_string_lossy().to_string());

        let status = match delta.status() {
            git2::Delta::Added => "added",
            git2::Delta::Deleted => "deleted",
            git2::Delta::Modified => "modified",
            git2::Delta::Renamed => "renamed",
            git2::Delta::Copied => "copied",
            _ => "modified",
        }.to_string();

        // Use new_path as the primary path, fallback to old_path for deleted files
        let path = new_path.clone().unwrap_or_else(|| old_path.clone().unwrap_or_default());

        // Get the diff for this specific file
        let mut diff_opts = DiffOptions::new();
        if let Some(new_p) = &new_path {
            diff_opts.pathspec(new_p);
        } else if let Some(old_p) = &old_path {
            diff_opts.pathspec(old_p);
        }

        // Collect hunks for this file
        let mut hunks = Vec::new();
        let mut current_hunk: Option<DiffHunk> = None;
        let mut current_hunk_header: Option<String> = None;
        let mut additions = 0usize;
        let mut deletions = 0usize;

        diff.print(git2::DiffFormat::Patch, |_delta, hunk, line| {
            if let Some(hunk_info) = hunk {
                let header = String::from_utf8_lossy(hunk_info.header()).to_string();
                let is_new_hunk = current_hunk_header.as_deref() != Some(header.as_str());

                if is_new_hunk {
                    if let Some(h) = current_hunk.take() {
                        hunks.push(h);
                    }

                    current_hunk_header = Some(header.clone());
                    current_hunk = Some(DiffHunk {
                        header,
                        lines: Vec::new(),
                    });
                }
            }

            if let Some(ref mut h) = current_hunk {
                let origin = line.origin();

                // Skip hunk header lines and file header lines
                if origin == 'H' || origin == 'F' {
                    return true;
                }

                let content = String::from_utf8_lossy(line.content()).to_string();
                let origin_char = match origin {
                    '+' => { additions += 1; '+' }
                    '-' => { deletions += 1; '-' }
                    ' ' => ' ',
                    '>' => '>',
                    '<' => '<',
                    _ => ' ',
                };

                h.lines.push(DiffLine {
                    origin: origin_char,
                    content,
                    old_lineno: line.old_lineno(),
                    new_lineno: line.new_lineno(),
                });
            }

            true
        }).map_err(|e| format!("Failed to print diff: {}", e))?;

        // Don't forget the last hunk
        if let Some(h) = current_hunk {
            hunks.push(h);
        }

        file_diffs.push(FileDiffWithStats {
            path,
            old_path: old_path.as_ref().filter(|_| new_path.is_some() && old_path.as_ref() != new_path.as_ref()).cloned(),
            status,
            additions,
            deletions,
            hunks,
        });
    }

    Ok(file_diffs)
}
