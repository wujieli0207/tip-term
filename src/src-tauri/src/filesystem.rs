use serde::Serialize;
use std::fs;
use std::path::PathBuf;

/// Represents a file or directory entry
#[derive(Debug, Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub is_symlink: bool,
    pub is_hidden: bool,
}

/// Expand tilde (~) in path to home directory
fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with('~') {
        if let Some(home) = std::env::var_os("HOME") {
            let home_path = PathBuf::from(home);
            if path == "~" {
                return home_path;
            } else if path.starts_with("~/") {
                return home_path.join(&path[2..]);
            }
        }
    }
    PathBuf::from(path)
}

/// Default patterns to exclude from file tree
const DEFAULT_EXCLUDE_PATTERNS: &[&str] = &[
    ".git",
    "node_modules",
    ".DS_Store",
    "__pycache__",
    "target",
    ".next",
    "dist",
    "build",
    ".idea",
    ".vscode",
    "*.pyc",
    ".cache",
    ".turbo",
];

/// Read directory contents and return file entries
#[tauri::command]
pub async fn read_directory(
    path: String,
    exclude_patterns: Option<Vec<String>>,
    show_hidden: Option<bool>,
) -> Result<Vec<FileEntry>, String> {
    // Expand ~ to home directory
    let expanded_path = expand_tilde(&path);
    let dir_path = expanded_path.as_path();

    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", dir_path.display()));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir_path.display()));
    }

    let show_hidden = show_hidden.unwrap_or(false);
    let exclude_patterns: Vec<String> = exclude_patterns
        .unwrap_or_else(|| DEFAULT_EXCLUDE_PATTERNS.iter().map(|s| s.to_string()).collect());

    let mut entries: Vec<FileEntry> = Vec::new();

    let read_dir = fs::read_dir(dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let file_name = entry.file_name().to_string_lossy().to_string();

        // Check if hidden (starts with .)
        let is_hidden = file_name.starts_with('.');
        if is_hidden && !show_hidden {
            continue;
        }

        // Check exclude patterns
        let should_exclude = exclude_patterns.iter().any(|pattern| {
            if pattern.starts_with("*.") {
                // Extension pattern
                let ext = &pattern[1..]; // ".pyc"
                file_name.ends_with(ext)
            } else {
                // Exact match
                file_name == *pattern
            }
        });

        if should_exclude {
            continue;
        }

        let file_path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let is_symlink = file_path.is_symlink();
        let is_directory = metadata.is_dir();

        entries.push(FileEntry {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_directory,
            is_symlink,
            is_hidden,
        });
    }

    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}
