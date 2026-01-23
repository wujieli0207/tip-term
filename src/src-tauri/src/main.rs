// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

// Import types from lib (tip_term library)
use tip_term::TerminalSession;

/// Global state for terminal sessions
pub struct TerminalState {
    pub sessions: HashMap<String, Arc<Mutex<TerminalSession>>>,
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
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

    let session = TerminalSession::new(80, 24, shell)
        .map_err(|e| format!("Failed to create terminal: {}", e))?;

    let mut state = state.lock().unwrap();
    let session_arc = Arc::new(Mutex::new(session));
    state.sessions.insert(session_id.clone(), session_arc.clone());

    let session_id_clone = session_id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;

            let session = session_arc.lock().unwrap();
            if let Some(grid) = session.get_render_grid() {
                drop(session);

                if let Err(e) = app_clone.emit(&format!("terminal-update-{}", session_id_clone), grid) {
                    eprintln!("Failed to emit terminal update: {}", e);
                    break;
                }
            }

            let mut session = session_arc.lock().unwrap();
            if !session.is_alive() {
                break;
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
    let state = state.lock().unwrap();
    let session = state
        .sessions
        .get(&id)
        .ok_or_else(|| "Session not found".to_string())?;

    let mut session = session.lock().unwrap();
    session.write(&data).map_err(|e| format!("Write failed: {}", e))?;
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
