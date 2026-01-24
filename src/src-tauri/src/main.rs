// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::io::Write;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

// Import types from lib (tip_term library)
use tip_term::{TerminalSession, ProcessInfo};

/// Type alias for the writer
type PtyWriter = Arc<Mutex<Box<dyn Write + Send>>>;

/// Global state for terminal sessions
pub struct TerminalState {
    pub sessions: HashMap<String, Arc<Mutex<TerminalSession>>>,
    pub writers: HashMap<String, PtyWriter>,
    pub session_pids: HashMap<String, u32>, // Store PIDs separately to avoid locking
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            writers: HashMap::new(),
            session_pids: HashMap::new(),
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

    let (session, writer, child_pid) = TerminalSession::new(80, 24, shell)
        .map_err(|e| format!("Failed to create terminal: {}", e))?;

    let mut state = state.lock().unwrap();
    let session_arc = Arc::new(Mutex::new(session));
    state.sessions.insert(session_id.clone(), session_arc.clone());
    state.writers.insert(session_id.clone(), writer);
    state.session_pids.insert(session_id.clone(), child_pid);

    let session_id_clone = session_id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        eprintln!("Terminal output loop started for session {}", session_id_clone);
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;

            // Read raw output from PTY and emit to frontend
            let output = {
                let mut session = session_arc.lock().unwrap();
                session.read_output().unwrap_or(None)
            };

            if let Some(data) = output {
                // Emit raw bytes to frontend - xterm.js will parse VTE sequences
                if let Err(e) = app_clone.emit(&format!("terminal-output-{}", session_id_clone), data) {
                    eprintln!("Failed to emit terminal output: {}", e);
                    break;
                }
            }

            // Check if the terminal is still alive
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
    // Get the session Arc first, then release the state lock
    let session = {
        let state = state.lock().unwrap();
        state
            .sessions
            .get(&id)
            .ok_or_else(|| "Session not found".to_string())?
            .clone()
    };

    // Now lock the session without holding the state lock
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
    state.session_pids.remove(&id);
    Ok(())
}

/// Get process information for a terminal session
#[tauri::command]
async fn get_session_info(
    id: String,
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
) -> Result<Option<ProcessInfo>, String> {
    // Get the child PID without locking the session
    let child_pid = {
        let state = state.lock().unwrap();
        *state
            .session_pids
            .get(&id)
            .ok_or_else(|| "Session not found".to_string())?
    };

    // Call get_process_info_by_pid directly without locking the session
    let info = tip_term::get_process_info_by_pid(child_pid);
    Ok(info)
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
            get_session_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
