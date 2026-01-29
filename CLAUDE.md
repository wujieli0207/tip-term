# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TipTerm is a Tauri-based terminal emulator application with a React/TypeScript frontend and Rust backend. It uses xterm.js for terminal rendering and VTE parsing, with portable-pty for PTY management.

## Development Commands

```bash
# Development (run both in separate terminals)
pnpm dev          # Start Vite dev server on port 1420
pnpm tauri dev    # Start Tauri app with hot reload

# Production build
pnpm build        # TypeScript compile + Vite bundle
pnpm tauri build  # Create distributable app
```

## Architecture

### Frontend (`src/`)

- **Tech**: React + TypeScript + Vite + Tailwind CSS
- **State**: Zustand stores in `stores/` (sessionStore, sidebarStore, settingsStore, fileTreeStore, gitStore, quickOpenStore, editorStore, splitPaneStore)
- **Types**: Shared types in `types/` (session.ts, file.ts, hotkey.ts, splitPane.ts, git.ts)
- **Hooks**: Reusable hooks in `hooks/` (useResizable, useHotkeyHandler, useProcessPolling)
- **Terminal**: xterm.js rendering in `components/XTerminal.tsx`
- **Split Panes**: Multi-window layout with `react-resizable-panels` in `components/terminal/` (SplitPaneContainer, TerminalPaneWrapper, TerminalContainer)
- **Sidebar**: Tab-based sidebar with Session/FileTree/Git tabs in `components/sidebar/` (Sidebar, SidebarHeader, SidebarTabSelector, SessionTabContent, FileTreeTabContent, GitTabContent, DetailPanelsContainer)
- **File Tree**: Directory browser in `components/filetree/`
  - Auto-expands parent directories and highlights opened files
- **Git**: Git status, diff viewer, commit actions, and commit diff viewer in `components/git/`
- **Quick Open**: File and hotkey search in `components/quickopen/` (QuickOpenModal, ResultItem, HotkeyResultItem, RecentSearches)
  - Filter tabs: All/Files/Hotkeys
  - Recent searches with file path or hotkey binding display
  - Execute hotkeys directly from search results
- **Editor**: Code editor in `components/editor/`
- **Settings**: Settings panel in `components/settings/`
- **UI Components**: Reusable components in `components/ui/` (Tooltip, icons, button, dialog, etc.)
- **Hotkeys**: Configurable shortcuts in `config/defaultHotkeys.ts`
  - Sidebar tabs: `⌃⌘1/2/3` for Session/Files/Git
  - Split pane: `Cmd+D`, `Cmd+Shift+D`, `Cmd+Alt+Arrow`

### Backend (`src-tauri/src/`)

- **main.rs**: Tauri commands and app setup
- **terminal/vte_parser.rs**: PTY session management
- **filesystem.rs**: File system operations (read_directory, search_files)
- **git.rs**: Git operations (status, diff, commit, push, recent commits, commit diff)

### Communication

- Frontend → Backend: Tauri `invoke()`
- Backend → Frontend: Event emissions (`terminal-output-{session_id}`)

## Layout Structure

```
┌───────────────────────────────────────────────────────────────┐
│  App                                                          │
│  ┌────────────┬─────────────┬──────────────────────────────┐  │
│  │ Sidebar    │ DetailPanel │ TerminalContainer             │  │
│  │ ┌────────┐ │ ┌─────────┐ │ ┌──────────────────────────┐  │  │
│  │ │ Header │ │ │GitDiff  │ │ │ XTerminal / SplitPane    │  │  │
│  │ │[Tabs]  │ │ │or Editor│ │ │                          │  │  │
│  │ ├────────┤ │ └─────────┘ │ └──────────────────────────┘  │  │
│  │ │Content │ │             │                              │  │
│  │ │(Tab)   │ │             │                              │  │
│  │ └────────┘ │             │                              │  │
│  └────────────┴─────────────┴──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

- **Sidebar**: Tab-based panel with Session/FileTree/Git tabs (icon buttons with tooltips)
- **DetailPanelsContainer**: GitDiffPanel, CommitDiffPanel, and EditorPanel (right of sidebar, triggered by file/commit selection)
- **TerminalContainer**: Terminal instances and split panes (main content area)

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
- `react-resizable-panels`: Resizable panel dividers for split panes
