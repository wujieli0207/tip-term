# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TipTerm is a Tauri-based terminal emulator application with a React/TypeScript frontend and Rust backend. It uses xterm.js for terminal rendering and VTE parsing, with portable-pty for PTY management.

## Development Commands

```bash
# All commands run from /src directory
cd src

# Development (run both in separate terminals)
pnpm dev          # Start Vite dev server on port 1420
pnpm tauri dev    # Start Tauri app with hot reload

# Production build
pnpm build        # TypeScript compile + Vite bundle
pnpm tauri build  # Create distributable app
```

## Architecture

### Frontend (src/src/)
- **React + TypeScript + Vite** with Tailwind CSS styling
- **State Management**: Zustand store (`stores/sessionStore.ts`) manages sessions, active session ID, and sidebar state
- **Terminal Rendering**: xterm.js in `XTerminal.tsx` with WebGL addon for GPU acceleration
  - FitAddon for automatic terminal sizing
  - Receives raw PTY bytes via Tauri events
  - Handles all VTE sequence parsing internally
- **Keyboard Shortcuts** (handled in App.tsx):
  - Cmd+T: New session
  - Cmd+W: Close active session
  - Cmd+\: Toggle sidebar
  - Cmd+1-9: Switch sessions

### Backend (src/src-tauri/src/)
- **main.rs**: Tauri command handlers and app initialization
  - 16ms event loop reading PTY output and emitting to frontend
- **terminal/vte_parser.rs**: PTY session management (~100 lines)
  - PTY creation via portable-pty crate
  - Raw byte output passthrough (no VTE parsing)
  - Terminal resize handling

### Communication Flow
- Frontend → Backend: Tauri `invoke()` for commands (create_session, write_to_session, resize_terminal, close_session)
- Backend → Frontend: Tauri event emissions with session-specific channel names (`terminal-output-{session_id}`) containing raw bytes

## Key Dependencies

**Rust**:
- `portable-pty`: Cross-platform PTY management
- `tokio`: Async runtime
- `tauri`: Desktop app framework

**TypeScript**:
- `@xterm/xterm`: Terminal emulator (VTE parsing + rendering)
- `@xterm/addon-fit`: Auto-resize terminal to container
- `@xterm/addon-webgl`: GPU-accelerated rendering
- `zustand`: State management
