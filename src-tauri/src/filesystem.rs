use ignore::WalkBuilder;
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
    pub match_type: String, // "prefix" | "contains"
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
            match_type: String::new(), // Not used for directory listing
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

/// Maximum file size for reading (5MB)
const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024;

/// Read file contents as string
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    let expanded_path = expand_tilde(&path);
    let file_path = expanded_path.as_path();

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", file_path.display()));
    }

    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", file_path.display()));
    }

    // Check file size
    let metadata = fs::metadata(file_path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    if metadata.len() > MAX_FILE_SIZE {
        return Err(format!(
            "File too large: {} bytes (max {} bytes)",
            metadata.len(),
            MAX_FILE_SIZE
        ));
    }

    // Read file contents
    fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to file
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    let expanded_path = expand_tilde(&path);
    let file_path = expanded_path.as_path();

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }

    // Write content to file
    fs::write(file_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

/// Reveal a file in Finder (macOS only)
#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("Failed to reveal in Finder: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        return Err("Reveal in Finder is only supported on macOS".to_string());
    }

    Ok(())
}

/// Search files recursively by name (fuzzy match)
/// Uses ignore crate to respect .gitignore files
#[tauri::command]
pub async fn search_files(
    root_path: String,
    query: String,
    max_results: Option<usize>,
    respect_gitignore: Option<bool>,
) -> Result<Vec<FileEntry>, String> {
    let expanded_path = expand_tilde(&root_path);
    let dir_path = expanded_path.as_path();

    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", dir_path.display()));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir_path.display()));
    }

    let max_results = max_results.unwrap_or(50);
    let respect_gitignore = respect_gitignore.unwrap_or(true);
    let query_lower = query.to_lowercase();

    let mut prefix_results: Vec<FileEntry> = Vec::new();
    let mut contains_results: Vec<FileEntry> = Vec::new();

    // Build walker with gitignore support
    let walker = WalkBuilder::new(dir_path)
        .hidden(false) // Don't skip hidden files (we filter them ourselves if needed)
        .git_ignore(respect_gitignore)
        .git_global(respect_gitignore)
        .git_exclude(respect_gitignore)
        .ignore(respect_gitignore) // Also respect .ignore files
        .build();

    for entry in walker {
        // Check if we have enough results
        if prefix_results.len() + contains_results.len() >= max_results * 2 {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let file_path = entry.path();

        // Skip directories
        let file_type = match entry.file_type() {
            Some(ft) => ft,
            None => continue,
        };
        if file_type.is_dir() {
            continue;
        }

        let file_name = match file_path.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => continue,
        };

        // Skip files matching default exclude patterns (for files that gitignore doesn't cover)
        let should_skip = DEFAULT_EXCLUDE_PATTERNS.iter().any(|pattern| {
            if pattern.starts_with("*.") {
                let ext = &pattern[1..]; // ".pyc"
                file_name.ends_with(ext)
            } else {
                file_name == *pattern
            }
        });

        if should_skip {
            continue;
        }

        // Check if filename matches query
        let name_lower = file_name.to_lowercase();
        if !name_lower.contains(&query_lower) {
            continue;
        }

        let is_symlink = file_path.is_symlink();
        let is_hidden = file_name.starts_with('.');

        // Determine match type: prefix or contains
        let match_type = if name_lower.starts_with(&query_lower) {
            "prefix".to_string()
        } else {
            "contains".to_string()
        };

        let file_entry = FileEntry {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_directory: false,
            is_symlink,
            is_hidden,
            match_type: match_type.clone(),
        };

        if match_type == "prefix" {
            prefix_results.push(file_entry);
        } else {
            contains_results.push(file_entry);
        }
    }

    // Sort each group alphabetically
    prefix_results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    contains_results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Combine results: prefix first, then contains
    let mut results: Vec<FileEntry> = Vec::new();

    // Take up to max_results, prioritizing prefix matches
    let prefix_count = prefix_results.len().min(max_results);
    results.extend(prefix_results.into_iter().take(prefix_count));

    let remaining = max_results.saturating_sub(results.len());
    results.extend(contains_results.into_iter().take(remaining));

    Ok(results)
}
