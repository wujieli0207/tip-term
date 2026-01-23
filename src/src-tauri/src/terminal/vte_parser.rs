use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use vte::{Params, Perform};

use crate::{Cell, RenderGrid};

/// Simple terminal grid that stores characters and styles
struct TerminalGrid {
    cols: usize,
    rows: usize,
    cells: Vec<Cell>,
    cursor_col: usize,
    cursor_row: usize,
    current_fg: String,
    current_bg: String,
    current_bold: bool,
    current_italic: bool,
}

impl TerminalGrid {
    fn new(cols: usize, rows: usize) -> Self {
        let default_cell = Cell {
            char: ' '.to_string(),
            fg: "#e5e5e5".to_string(),
            bg: "#0a0a0a".to_string(),
            bold: false,
            italic: false,
        };

        Self {
            cols,
            rows,
            cells: vec![default_cell; cols * rows],
            cursor_col: 0,
            cursor_row: 0,
            current_fg: "#e5e5e5".to_string(),
            current_bg: "#0a0a0a".to_string(),
            current_bold: false,
            current_italic: false,
        }
    }

    fn get_index(&self, col: usize, row: usize) -> usize {
        (row % self.rows) * self.cols + (col % self.cols)
    }

    fn put_char(&mut self, c: char) {
        let idx = self.get_index(self.cursor_col, self.cursor_row);
        self.cells[idx] = Cell {
            char: c.to_string(),
            fg: self.current_fg.clone(),
            bg: self.current_bg.clone(),
            bold: self.current_bold,
            italic: self.current_italic,
        };

        self.cursor_col += 1;
        if self.cursor_col >= self.cols {
            self.cursor_col = 0;
            self.cursor_row += 1;
            if self.cursor_row >= self.rows {
                self.scroll_up();
                self.cursor_row = self.rows - 1;
            }
        }
    }

    fn scroll_up(&mut self) {
        for row in 0..(self.rows - 1) {
            for col in 0..self.cols {
                let dst = row * self.cols + col;
                let src = (row + 1) * self.cols + col;
                self.cells[dst] = self.cells[src].clone();
            }
        }

        let default_cell = Cell {
            char: ' '.to_string(),
            fg: "#e5e5e5".to_string(),
            bg: "#0a0a0a".to_string(),
            bold: false,
            italic: false,
        };

        for col in 0..self.cols {
            self.cells[(self.rows - 1) * self.cols + col] = default_cell.clone();
        }
    }

    fn carriage_return(&mut self) {
        self.cursor_col = 0;
    }

    fn line_feed(&mut self) {
        self.cursor_row += 1;
        if self.cursor_row >= self.rows {
            self.scroll_up();
            self.cursor_row = self.rows - 1;
        }
    }

    fn backspace(&mut self) {
        if self.cursor_col > 0 {
            self.cursor_col -= 1;
            let idx = self.get_index(self.cursor_col, self.cursor_row);
            self.cells[idx] = Cell {
                char: ' '.to_string(),
                fg: self.current_fg.clone(),
                bg: self.current_bg.clone(),
                bold: false,
                italic: false,
            };
        }
    }

    fn clear_screen(&mut self) {
        let default_cell = Cell {
            char: ' '.to_string(),
            fg: "#e5e5e5".to_string(),
            bg: "#0a0a0a".to_string(),
            bold: false,
            italic: false,
        };
        self.cells = vec![default_cell; self.cols * self.rows];
        self.cursor_col = 0;
        self.cursor_row = 0;
    }

    fn move_cursor(&mut self, col: usize, row: usize) {
        self.cursor_col = col.min(self.cols - 1);
        self.cursor_row = row.min(self.rows - 1);
    }

    fn set_fg(&mut self, color: String) {
        self.current_fg = color;
    }

    fn set_bg(&mut self, color: String) {
        self.current_bg = color;
    }

    fn set_bold(&mut self, bold: bool) {
        self.current_bold = bold;
    }

    fn set_italic(&mut self, italic: bool) {
        self.current_italic = italic;
    }

    fn reset_style(&mut self) {
        self.current_fg = "#e5e5e5".to_string();
        self.current_bg = "#0a0a0a".to_string();
        self.current_bold = false;
        self.current_italic = false;
    }

    fn to_render_grid(&self) -> RenderGrid {
        RenderGrid {
            cols: self.cols,
            rows: self.rows,
            cells: self.cells.clone(),
        }
    }
}

/// VTE performer that implements the vte::Perform trait
struct TerminalPerformer {
    grid: Arc<Mutex<TerminalGrid>>,
}

impl TerminalPerformer {
    fn new(cols: usize, rows: usize) -> Self {
        Self {
            grid: Arc::new(Mutex::new(TerminalGrid::new(cols, rows))),
        }
    }
}

impl Perform for TerminalPerformer {
    fn print(&mut self, c: char) {
        let mut grid = self.grid.lock().unwrap();
        grid.put_char(c);
    }

    fn execute(&mut self, byte: u8) {
        match byte {
            b'\r' => {
                let mut grid = self.grid.lock().unwrap();
                grid.carriage_return();
            }
            b'\n' => {
                let mut grid = self.grid.lock().unwrap();
                grid.line_feed();
            }
            b'\x08' => {
                let mut grid = self.grid.lock().unwrap();
                grid.backspace();
            }
            b'\x07' => {
                // Bell - ignore
            }
            b'\x00' | b'\x7f' => {
                // NUL and DEL - ignore
            }
            _ => {
                // Other control characters - ignore for MVP
            }
        }
    }

    fn csi_dispatch(
        &mut self,
        params: &Params,
        _intermediates: &[u8],
        _ignore: bool,
        c: char,
    ) {
        let mut grid = self.grid.lock().unwrap();

        match c {
            'J' => {
                let mode = params
                    .iter()
                    .next()
                    .and_then(|group| group.first())
                    .copied()
                    .unwrap_or(0);
                if mode == 2 || mode == 3 {
                    grid.clear_screen();
                }
            }
            'K' => {
                // Erase line - ignore for MVP
            }
            'H' => {
                let mut iter = params.iter();
                let row = iter
                    .next()
                    .and_then(|group| group.first())
                    .copied()
                    .unwrap_or(1);
                let col = iter
                    .next()
                    .and_then(|group| group.first())
                    .copied()
                    .unwrap_or(1);
                grid.move_cursor((col - 1) as usize, (row - 1) as usize);
            }
            'A' => {
                let n = params
                    .iter()
                    .next()
                    .and_then(|group| group.first())
                    .copied()
                    .unwrap_or(1);
                let col = grid.cursor_col;
                let new_row = grid.cursor_row.saturating_sub(n as usize);
                grid.move_cursor(col, new_row);
            }
            'B' => {
                let n = params
                    .iter()
                    .next()
                    .and_then(|group| group.first())
                    .copied()
                    .unwrap_or(1);
                let col = grid.cursor_col;
                let new_row = (grid.cursor_row + n as usize).min(grid.rows - 1);
                grid.move_cursor(col, new_row);
            }
            'C' => {
                let n = params
                    .iter()
                    .next()
                    .and_then(|group| group.first())
                    .copied()
                    .unwrap_or(1);
                let row = grid.cursor_row;
                let new_col = (grid.cursor_col + n as usize).min(grid.cols - 1);
                grid.move_cursor(new_col, row);
            }
            'D' => {
                let n = params
                    .iter()
                    .next()
                    .and_then(|group| group.first())
                    .copied()
                    .unwrap_or(1);
                let row = grid.cursor_row;
                let new_col = grid.cursor_col.saturating_sub(n as usize);
                grid.move_cursor(new_col, row);
            }
            'm' => {
                if params.is_empty() {
                    grid.reset_style();
                } else {
                    for param_group in params.iter() {
                        for &param in param_group {
                            match param {
                                0 => grid.reset_style(),
                                1 => grid.set_bold(true),
                                3 => grid.set_italic(true),
                                22 => grid.set_bold(false),
                                23 => grid.set_italic(false),
                                30 => grid.set_fg("#000000".to_string()),
                                31 => grid.set_fg("#cd3131".to_string()),
                                32 => grid.set_fg("#0dbc79".to_string()),
                                33 => grid.set_fg("#e5e510".to_string()),
                                34 => grid.set_fg("#2472c8".to_string()),
                                35 => grid.set_fg("#bc3fbc".to_string()),
                                36 => grid.set_fg("#11a8cd".to_string()),
                                37 => grid.set_fg("#e5e5e5".to_string()),
                                39 => grid.set_fg("#e5e5e5".to_string()),
                                90 => grid.set_fg("#666666".to_string()),
                                91 => grid.set_fg("#f14c4c".to_string()),
                                92 => grid.set_fg("#23d18b".to_string()),
                                93 => grid.set_fg("#f5f543".to_string()),
                                94 => grid.set_fg("#3b8eea".to_string()),
                                95 => grid.set_fg("#d670d6".to_string()),
                                96 => grid.set_fg("#29b8db".to_string()),
                                97 => grid.set_fg("#ffffff".to_string()),
                                40 => grid.set_bg("#000000".to_string()),
                                41 => grid.set_bg("#cd3131".to_string()),
                                42 => grid.set_bg("#0dbc79".to_string()),
                                43 => grid.set_bg("#e5e510".to_string()),
                                44 => grid.set_bg("#2472c8".to_string()),
                                45 => grid.set_bg("#bc3fbc".to_string()),
                                46 => grid.set_bg("#11a8cd".to_string()),
                                47 => grid.set_bg("#e5e5e5".to_string()),
                                49 => grid.set_bg("#0a0a0a".to_string()),
                                100 => grid.set_bg("#666666".to_string()),
                                101 => grid.set_bg("#f14c4c".to_string()),
                                102 => grid.set_bg("#23d18b".to_string()),
                                103 => grid.set_bg("#f5f543".to_string()),
                                104 => grid.set_bg("#3b8eea".to_string()),
                                105 => grid.set_bg("#d670d6".to_string()),
                                106 => grid.set_bg("#29b8db".to_string()),
                                107 => grid.set_bg("#ffffff".to_string()),
                                _ => {}
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    fn esc_dispatch(&mut self, _intermediates: &[u8], _ignore: bool, _byte: u8) {
        // ESC sequences - ignore for MVP
    }

    fn hook(&mut self, _params: &Params, _intermediates: &[u8], _ignore: bool, _action: char) {
        // DCS hook - ignore for MVP
    }

    fn put(&mut self, _byte: u8) {
        // DCS put - ignore for MVP
    }

    fn unhook(&mut self) {
        // DCS unhook - ignore for MVP
    }

    fn osc_dispatch(&mut self, _params: &[&[u8]], _bell_terminated: bool) {
        // OSC sequences - ignore for MVP
    }
}

/// Terminal session using vte parser and portable-pty
pub struct TerminalSession {
    grid: Arc<Mutex<TerminalGrid>>,
    performer: TerminalPerformer,
    parser: vte::Parser,
    _child: Box<dyn portable_pty::Child + Send>,
    reader: Box<dyn Read + Send>,
    writer: Box<dyn Write + Send>,
    cols: usize,
    rows: usize,
    pending_update: Arc<Mutex<bool>>,
    master_pty: Box<dyn MasterPty + Send>,
}

impl TerminalSession {
    /// Create a new terminal session
    pub fn new(cols: usize, rows: usize, shell: String) -> std::io::Result<Self> {
        let pty_system = native_pty_system();
        let pty_size = PtySize {
            rows: rows as u16,
            cols: cols as u16,
            pixel_width: 0,
            pixel_height: 0,
        };

        let cmd = CommandBuilder::new(shell);
        let pty_pair = pty_system
            .openpty(pty_size)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        // Spawn the child process
        let child = pty_pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        // Get reader and writer from the master PTY
        let reader = pty_pair
            .master
            .try_clone_reader()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
        let writer = pty_pair
            .master
            .take_writer()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        let performer = TerminalPerformer::new(cols, rows);
        let grid = performer.grid.clone();

        Ok(Self {
            grid,
            performer,
            parser: vte::Parser::new(),
            _child: child,
            reader,
            writer,
            cols,
            rows,
            pending_update: Arc::new(Mutex::new(true)),
            master_pty: pty_pair.master,
        })
    }

    /// Write data to the terminal
    pub fn write(&mut self, data: &str) -> std::io::Result<()> {
        let bytes = data.as_bytes();
        self.writer.write_all(bytes)?;
        self.writer.flush()?;
        Ok(())
    }

    /// Resize the terminal
    pub fn resize(&mut self, cols: usize, rows: usize) -> std::io::Result<()> {
        self.cols = cols;
        self.rows = rows;

        let size = PtySize {
            rows: rows as u16,
            cols: cols as u16,
            pixel_width: 0,
            pixel_height: 0,
        };

        self.master_pty
            .resize(size)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        let new_grid = TerminalGrid::new(cols, rows);
        *self.grid.lock().unwrap() = new_grid;

        Ok(())
    }

    /// Read from PTY and update terminal
    pub fn update(&mut self) -> std::io::Result<bool> {
        let mut buffer = [0u8; 8192];
        let n = self.reader.read(&mut buffer)?;

        if n > 0 {
            self.parser.advance(&mut self.performer, &buffer[..n]);
            *self.pending_update.lock().unwrap() = true;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Get the render grid for the frontend
    pub fn get_render_grid(&self) -> Option<RenderGrid> {
        if !*self.pending_update.lock().unwrap() {
            return None;
        }

        let grid = self.grid.lock().unwrap();
        let render_grid = grid.to_render_grid();
        *self.pending_update.lock().unwrap() = false;

        Some(render_grid)
    }

    /// Check if the terminal is still alive
    pub fn is_alive(&mut self) -> bool {
        // Try to poll the child process
        // Returns true if still running (None result), false if exited
        self._child.try_wait().map(|status| status.is_none()).unwrap_or(true)
    }
}
