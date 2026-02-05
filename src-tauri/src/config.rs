use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct ConfigWatchState {
    pub watcher: Option<RecommendedWatcher>,
    pub watched_path: Option<PathBuf>,
}

impl ConfigWatchState {
    pub fn new() -> Self {
        Self {
            watcher: None,
            watched_path: None,
        }
    }
}

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

#[tauri::command]
pub async fn start_terminal_config_watcher(
    path: String,
    app: AppHandle,
    state: State<'_, Arc<Mutex<ConfigWatchState>>>,
) -> Result<(), String> {
    let path = expand_tilde(&path);
    let watch_dir = path.parent().map(Path::to_path_buf).ok_or_else(|| {
        format!("Invalid config path: {}", path.display())
    })?;

    let app_handle = app.clone();
    let path_clone = path.clone();

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            let matches_target = event.paths.iter().any(|p| p == &path_clone);
            if matches_target {
                let _ = app_handle.emit("terminal-config-changed", path_clone.to_string_lossy().to_string());
            }
        }
    })
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&watch_dir, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch config directory: {}", e))?;

    let mut state = state.lock().unwrap();
    state.watcher = Some(watcher);
    state.watched_path = Some(path);

    Ok(())
}
