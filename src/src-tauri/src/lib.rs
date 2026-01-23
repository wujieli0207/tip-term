// Re-export terminal module for library use
pub mod terminal;

use serde::{Deserialize, Serialize};

// Types shared across the project
/// Represents a single cell in the terminal grid
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cell {
    pub char: String,
    pub fg: String,
    pub bg: String,
    pub bold: bool,
    pub italic: bool,
}

/// The render grid sent to the frontend
#[derive(Debug, Clone, Serialize)]
pub struct RenderGrid {
    pub cols: usize,
    pub rows: usize,
    pub cells: Vec<Cell>,
}

pub use terminal::TerminalSession;
