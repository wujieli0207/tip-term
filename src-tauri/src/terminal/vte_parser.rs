use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use sysinfo::{ProcessesToUpdate, System};

/// Type alias for PTY writer that can be shared across threads
pub type PtyWriter = Arc<Mutex<Box<dyn Write + Send>>>;

/// Process information for a terminal session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub name: String,
    pub cwd: String,
}

/// Terminal session that manages PTY and passes raw output to frontend
/// VTE parsing is handled by xterm.js on the frontend
pub struct TerminalSession {
    child: Box<dyn portable_pty::Child + Send>,
    reader: Arc<Mutex<Box<dyn Read + Send>>>,
    master_pty: Box<dyn MasterPty + Send>,
    child_pid: u32,
}

impl TerminalSession {
    /// Create a new terminal session
    /// Returns the session, a separate writer handle, and the child PID
    pub fn new(cols: usize, rows: usize, shell: String) -> std::io::Result<(Self, PtyWriter, u32)> {
        let pty_system = native_pty_system();
        let pty_size = PtySize {
            rows: rows as u16,
            cols: cols as u16,
            pixel_width: 0,
            pixel_height: 0,
        };

        let mut cmd = CommandBuilder::new(shell);
        // Set TERM environment variable to ensure proper terminal behavior
        // This is critical for packaged apps which don't inherit terminal environment
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("LANG", "en_US.UTF-8");
        let pty_pair = pty_system
            .openpty(pty_size)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        // Spawn the child process
        let child = pty_pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        // Get the child process ID
        let child_pid = child.process_id().unwrap_or(0);

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
            child,
            reader: Arc::new(Mutex::new(reader)),
            master_pty: pty_pair.master,
            child_pid,
        };

        Ok((session, writer_handle, child_pid))
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
        self.child.try_wait().map(|status| status.is_none()).unwrap_or(true)
    }

    /// Get process information for the foreground process
    pub fn get_process_info(&self) -> Option<ProcessInfo> {
        #[cfg(target_os = "macos")]
        {
            self.get_process_info_unix()
        }
        #[cfg(target_os = "linux")]
        {
            self.get_process_info_unix()
        }
        #[cfg(target_os = "windows")]
        {
            self.get_process_info_windows()
        }
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    fn get_process_info_unix(&self) -> Option<ProcessInfo> {
        // Get the foreground process group ID from the PTY
        let fd = match self.master_pty.as_raw_fd() {
            Some(fd) => fd,
            None => {
                // If we can't get FD, just use the child PID
                return self.get_process_by_pid(self.child_pid);
            }
        };

        let fg_pid = unsafe {
            let pgrp = libc::tcgetpgrp(fd);
            if pgrp < 0 {
                // If we can't get the foreground process group, use the child PID
                self.child_pid
            } else {
                pgrp as u32
            }
        };

        self.get_process_by_pid(fg_pid)
    }

    /// Helper function to get process info by PID
    fn get_process_by_pid(&self, pid: u32) -> Option<ProcessInfo> {
        get_process_info_by_pid_impl(pid)
    }

    #[cfg(target_os = "windows")]
    fn get_process_info_windows(&self) -> Option<ProcessInfo> {
        // For Windows, we'll use the child PID directly
        get_process_info_by_pid_impl(self.child_pid)
    }
}

/// Get process information by PID (public function that doesn't require session lock)
pub fn get_process_info_by_pid(pid: u32) -> Option<ProcessInfo> {
    get_process_info_by_pid_impl(pid)
}

/// Internal implementation of process info lookup
fn get_process_info_by_pid_impl(pid: u32) -> Option<ProcessInfo> {
    // Use sysinfo to get process name
    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let process_pid = sysinfo::Pid::from_u32(pid);
    let process = system.process(process_pid)?;
    let name = process.name().to_string_lossy().to_string();

    // Get cwd using platform-specific method
    let cwd = get_process_cwd(pid).unwrap_or_else(|| "~".to_string());

    Some(ProcessInfo { name, cwd })
}

/// Get the current working directory of a process
#[cfg(target_os = "macos")]
fn get_process_cwd(pid: u32) -> Option<String> {
    use std::ffi::CStr;
    use std::mem;

    // Use proc_pidinfo to get the current directory on macOS
    #[repr(C)]
    struct VnodePathInfo {
        cdir: VnodeInfoPath,
        rdir: VnodeInfoPath,
    }

    #[repr(C)]
    struct VnodeInfoPath {
        _vip_vi: [u8; 152], // vnode_info struct, we don't need the details
        vip_path: [i8; 1024], // MAXPATHLEN
    }

    const PROC_PIDVNODEPATHINFO: i32 = 9;

    extern "C" {
        fn proc_pidinfo(
            pid: i32,
            flavor: i32,
            arg: u64,
            buffer: *mut libc::c_void,
            buffersize: i32,
        ) -> i32;
    }

    let mut vpi: VnodePathInfo = unsafe { mem::zeroed() };
    let size = mem::size_of::<VnodePathInfo>() as i32;

    let result = unsafe {
        proc_pidinfo(
            pid as i32,
            PROC_PIDVNODEPATHINFO,
            0,
            &mut vpi as *mut _ as *mut libc::c_void,
            size,
        )
    };

    if result <= 0 {
        return None;
    }

    // Convert the path from C string
    let cwd = unsafe {
        CStr::from_ptr(vpi.cdir.vip_path.as_ptr())
            .to_string_lossy()
            .to_string()
    };

    if cwd.is_empty() {
        None
    } else {
        Some(cwd)
    }
}

#[cfg(target_os = "linux")]
fn get_process_cwd(pid: u32) -> Option<String> {
    // On Linux, read from /proc/<pid>/cwd
    std::fs::read_link(format!("/proc/{}/cwd", pid))
        .ok()
        .map(|p| p.to_string_lossy().to_string())
}

#[cfg(target_os = "windows")]
fn get_process_cwd(_pid: u32) -> Option<String> {
    // Windows doesn't have an easy way to get another process's cwd
    // Return None to use default
    None
}
