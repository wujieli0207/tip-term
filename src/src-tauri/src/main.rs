// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::io::Write;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

// Import types from lib (tip_term library)
use tip_term::TerminalSession;

/// Type alias for the writer
type PtyWriter = Arc<Mutex<Box<dyn Write + Send>>>;

/// Global state for terminal sessions
pub struct TerminalState {
    pub sessions: HashMap<String, Arc<Mutex<TerminalSession>>>,
    pub writers: HashMap<String, PtyWriter>,
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            writers: HashMap::new(),
        }
    }
}

/// Create a new terminal session
#[tauri::command]
async fn create_session(
    shell: String,
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
) -> Result<String, String> {
    let session_id = Uuid::new_v4().to_string();

    let (session, writer) = TerminalSession::new(80, 24, shell)
        .map_err(|e| format!("Failed to create terminal: {}", e))?;

    let mut state = state.lock().unwrap();
    let session_arc = Arc::new(Mutex::new(session));
    state.sessions.insert(session_id.clone(), session_arc.clone());
    state.writers.insert(session_id.clone(), writer);

    let session_id_clone = session_id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        eprintln!("Terminal update loop started for session {}", session_id_clone);
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;

            // 1. First, read from PTY and parse VTE sequences (needs mutable reference)
            let has_update = {
                let mut session = session_arc.lock().unwrap();
                session.update().unwrap_or(false)
            };

            // 2. If there was an update, get the render grid and emit it
            if has_update {
                let session = session_arc.lock().unwrap();
                if let Some(grid) = session.get_render_grid() {
                    drop(session);

                    eprintln!("Emitting terminal update: {} cols x {} rows, {} cells", grid.cols, grid.rows, grid.cells.len());
                    if let Err(e) = app_clone.emit(&format!("terminal-update-{}", session_id_clone), grid) {
                        eprintln!("Failed to emit terminal update: {}", e);
                        break;
                    }
                }
            }

            // 3. Check if the terminal is still alive
            {
                let mut session = session_arc.lock().unwrap();
                if !session.is_alive() {
                    eprintln!("Terminal session {} ended", session_id_clone);
                    break;
                }
            }
        }
    });

    Ok(session_id)
}

/// Write data to a terminal session
#[tauri::command]
async fn write_to_session(
    id: String,
    data: String,
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
) -> Result<(), String> {
    // Get the writer from state - this doesn't require locking the session
    let writer = {
        let state = state.lock().unwrap();
        state
            .writers
            .get(&id)
            .ok_or_else(|| "Session not found".to_string())?
            .clone()
    };

    // Write directly to PTY without holding any session lock
    let mut writer = writer.lock().unwrap();
    writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Write failed: {}", e))?;
    writer.flush().map_err(|e| format!("Flush failed: {}", e))?;
    Ok(())
}

/// Resize a terminal session
#[tauri::command]
async fn resize_terminal(
    id: String,
    cols: usize,
    rows: usize,
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
) -> Result<(), String> {
    let state = state.lock().unwrap();
    let session = state
        .sessions
        .get(&id)
        .ok_or_else(|| "Session not found".to_string())?;

    let mut session = session.lock().unwrap();
    session.resize(cols, rows).map_err(|e| format!("Resize failed: {}", e))?;
    Ok(())
}

/// Close a terminal session
#[tauri::command]
async fn close_session(
    id: String,
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
) -> Result<(), String> {
    let mut state = state.lock().unwrap();
    state.sessions.remove(&id);
    state.writers.remove(&id);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            app.manage(Arc::new(Mutex::new(TerminalState::new())));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_session,
            write_to_session,
            resize_terminal,
            close_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
