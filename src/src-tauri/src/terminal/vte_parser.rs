use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};

/// Type alias for PTY writer that can be shared across threads
pub type PtyWriter = Arc<Mutex<Box<dyn Write + Send>>>;

/// Terminal session that manages PTY and passes raw output to frontend
/// VTE parsing is handled by xterm.js on the frontend
pub struct TerminalSession {
    _child: Box<dyn portable_pty::Child + Send>,
    reader: Arc<Mutex<Box<dyn Read + Send>>>,
    master_pty: Box<dyn MasterPty + Send>,
}

impl TerminalSession {
    /// Create a new terminal session
    /// Returns the session and a separate writer handle for thread-safe writing
    pub fn new(cols: usize, rows: usize, shell: String) -> std::io::Result<(Self, PtyWriter)> {
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

        // Create the writer handle separately so it can be used without locking the session
        let writer_handle: PtyWriter = Arc::new(Mutex::new(writer));

        let session = Self {
            _child: child,
            reader: Arc::new(Mutex::new(reader)),
            master_pty: pty_pair.master,
        };

        Ok((session, writer_handle))
    }

    /// Resize the terminal
    pub fn resize(&mut self, cols: usize, rows: usize) -> std::io::Result<()> {
        let size = PtySize {
            rows: rows as u16,
            cols: cols as u16,
            pixel_width: 0,
            pixel_height: 0,
        };

        self.master_pty
            .resize(size)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        Ok(())
    }

    /// Read raw output from PTY (non-blocking)
    /// Returns Some(bytes) if data is available, None otherwise
    pub fn read_output(&mut self) -> std::io::Result<Option<Vec<u8>>> {
        let mut buffer = [0u8; 8192];

        // Try to acquire reader lock
        let reader_result = self.reader.try_lock();
        if reader_result.is_err() {
            // Lock is held by another operation, skip this read
            return Ok(None);
        }

        let mut reader = reader_result.unwrap();
        match reader.read(&mut buffer) {
            Ok(0) => {
                // EOF - terminal closed
                Ok(None)
            }
            Ok(n) => {
                // Got data, return raw bytes
                Ok(Some(buffer[..n].to_vec()))
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // No data available right now
                Ok(None)
            }
            Err(e) => {
                // Actual error
                Err(e)
            }
        }
    }

    /// Check if the terminal is still alive
    pub fn is_alive(&mut self) -> bool {
        // Try to poll the child process
        // Returns true if still running (None result), false if exited
        self._child.try_wait().map(|status| status.is_none()).unwrap_or(true)
    }
}
