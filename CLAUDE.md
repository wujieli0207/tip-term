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

### Frontend (`src/src/`)
- **Tech**: React + TypeScript + Vite + Tailwind CSS
- **State**: Zustand stores in `stores/` (session, settings, fileTree, quickOpen)
- **Terminal**: xterm.js rendering in `components/XTerminal.tsx`
- **Session Groups**: Edge-style grouping in `components/group/`
- **File Tree**: Directory browser in `components/filetree/`
- **Quick Open**: File search modal in `components/QuickOpenModal.tsx`
- **Settings**: Settings panel in `components/settings/`
- **Hotkeys**: Configurable shortcuts in `config/defaultHotkeys.ts`, handler in `hooks/useHotkeyHandler.ts`

### Backend (`src/src-tauri/src/`)
- **main.rs**: Tauri commands and app setup
- **terminal/vte_parser.rs**: PTY session management
- **filesystem.rs**: File system operations (read_directory, search_files)

### Communication
- Frontend → Backend: Tauri `invoke()`
- Backend → Frontend: Event emissions (`terminal-output-{session_id}`)

## Key Dependencies

**Rust**:
- `portable-pty`: Cross-platform PTY management
- `tokio`: Async runtime
- `tauri`: Desktop app framework
- `ignore`: Gitignore parsing (ripgrep's library)

**TypeScript**:
- `@xterm/xterm`: Terminal emulator (VTE parsing + rendering)
- `@xterm/addon-fit`: Auto-resize terminal to container
- `@xterm/addon-webgl`: GPU-accelerated rendering
- `zustand`: State management
