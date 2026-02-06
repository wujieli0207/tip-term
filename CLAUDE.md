# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TipTerm is a Tauri-based terminal emulator application with a React/TypeScript frontend and Rust backend. It uses xterm.js for terminal rendering (VTE parsing handled by xterm) and portable-pty for PTY management. Terminal functionality is centralized under `src/terminal-core/` with config-driven behavior.

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
- **State**: Zustand stores in `stores/` (sessionStore, sidebarStore, settingsStore, terminalConfigStore, fileTreeStore, gitStore, quickOpenStore, editorStore, splitPaneStore)
- **Types**: Shared types in `types/` (session.ts, file.ts, hotkey.ts, splitPane.ts, git.ts, theme.ts)
- **Hooks**: Reusable hooks in `hooks/` (useResizable, useHotkeyHandler, useProcessPolling)
- **Terminal Core**: `src/terminal-core/` (terminalRegistry, config loader/watcher, API)
- **Terminal**: xterm.js rendering managed by terminal-core, UI wrapper in `components/XTerminal.tsx`
- **Split Panes**: Multi-window layout with `react-resizable-panels` in `components/terminal/` (SplitPaneContainer, TerminalPaneWrapper, TerminalContainer)
- **Sidebar**: Tab-based sidebar with Session/FileTree/Git tabs in `components/sidebar/` (Sidebar, SidebarHeader, SidebarTabSelector, SessionTabContent, FileTreeTabContent, GitTabContent, DetailPanelsContainer)
- **File Tree**: Directory browser in `components/filetree/` using `react-arborist`
  - Virtual scrolling for large directories
  - Auto-expands parent directories and highlights opened files
- **Git**: Git status, diff viewer, commit actions, and commit diff viewer in `components/git/`
  - Diff viewing powered by `@pierre/diffs` with Shiki syntax highlighting
  - Unified/Split view toggle, theme-aware rendering
  - Adapter utilities in `utils/diffAdapter.ts` for FileDiff → unified patch conversion
- **Quick Open**: File and hotkey search in `components/quickopen/` (QuickOpenModal, ResultItem, HotkeyResultItem, RecentSearches)
  - Filter tabs: All/Files/Hotkeys
  - Recent searches with file path or hotkey binding display
  - Execute hotkeys directly from search results
- **Editor**: Code editor in `components/editor/`
- **Settings**: Settings panel in `components/settings/` with theme support
- **Config File**: Terminal config at `appConfigDir()/tipterm/config.json` with hot reload and validation
- **Theme**: Color scheme system in `config/defaultColorSchemes.ts` and `services/themeService.ts`
  - Theme modes: Dark / Light / Auto (follow system)
  - 12 predefined color schemes (Tabby, Dracula, Tokyo Night, Nord, etc.)
- **UI Components**: Reusable components in `components/ui/` (Tooltip, icons, button, dialog, etc.)
- **Hotkeys**: Configurable shortcuts in `config/defaultHotkeys.ts`
  - Sidebar tabs: `⌃⌘1/2/3` for Session/Files/Git
  - Split pane: `Cmd+D`, `Cmd+Shift+D`, `Cmd+Alt+Arrow`
  - Terminal search: Next/Prev + case/regex/whole-word toggles

## Theme System

- **Type definitions**: `src/types/theme.ts` - `TerminalColorScheme`, `ThemeMode`
- **Color schemes**: `src/config/defaultColorSchemes.ts` - 12 predefined themes
- **Theme service**: `src/services/themeService.ts` - Theme switching via `window.matchMedia`
- **CSS variables**: `src/styles.css` - Light/dark theme variables via `data-theme` attribute
- **Settings**: Theme mode and color scheme selection in Appearance settings

## UI Design Specification

Design source: Pencil file `tipterm.pen`

### Typography

| Usage | Font | Size | Weight |
|-------|------|------|--------|
| UI text | Space Grotesk | 13-14px | normal/500 |
| Page headers (Settings) | Space Grotesk | 16px (`text-lg`) | 500 |
| Page descriptions | Space Grotesk | 12px (`text-xs`) | 400 |
| Section headers | Space Grotesk | 14px (`text-sm`) | 500 |
| Code/Terminal | JetBrains Mono | 12-13px | normal |
| Hotkey labels | JetBrains Mono | 10-11px | normal |

### Spacing & Sizing

**Border Radius**
- Global radius: `10px` (via `--radius`)
- Cards/Menus: `10px`
- Buttons/Tabs/Inputs: `6-8px` (derived from `--radius`)
- Pills/Tags: `9999px` (fully rounded)

**Component Dimensions**
| Component | Size |
|-----------|------|
| Title Bar | h: 36px |
| Sidebar | w: 220px (resizable) |
| Sidebar Tabs | h: 44px |
| Tab button | 32×32px |
| Session item | h: 40px |
| Settings sidebar item | h: 40px |
| File item | h: 28px |
| Search/Input | h: 36px |
| Hotkey badge | 20×20px |

### Icons

- Icon libraries: **Lucide Icons** (`lucide-react`), **Tabler Icons** (`@tabler/icons-react`)
- Sizes: `12px` (small) / `14px` (standard) / `16px` (medium) / `18px` (large)

### Component States

**List Items (Session/File)**
| State | Background | Text |
|-------|------------|------|
| Default | none | `text-secondary` |
| Hover | `bg-hover` | `text-secondary` |
| Active | `bg-active` | `text-primary` |

**Tab Buttons**
| State | Background | Icon |
|-------|------------|------|
| Default | none | `text-muted` |
| Active | `bg-active` | `text-primary` |

**Accent Color Usage**
- `accent-primary`: Primary buttons, selected item highlights
- `accent-cyan`: Terminal cursor, directory names, links
- `accent-green`: Terminal prompt, success states
- `accent-orange`: Folder icons, JSON string values
- `accent-red`: Error states, delete actions, Git deleted lines

### Backend (`src-tauri/src/`)

- **main.rs**: Tauri commands and app setup
- **terminal/vte_parser.rs**: PTY session management
- **filesystem.rs**: File system operations (read_directory, search_files, write_file with mkdir -p)
- **git.rs**: Git operations (status, diff, commit, push, recent commits, commit diff)
- **config.rs**: Config file watcher (notify) emitting `terminal-config-changed`

### Communication

- Frontend → Backend: Tauri `invoke()`
- Backend → Frontend: Event emissions (`terminal-output-{session_id}`)

## Terminal Core Architecture

- **Core path**: `src/terminal-core/`
- **API surface**: `src/terminal-core/api/terminalApi.ts`
- **Registry**: `src/terminal-core/terminalRegistry.ts`
- **Config**: `src/terminal-core/config/` (defaults, schema, loader, watcher)
- **Config store**: `src/stores/terminalConfigStore.ts`
- **Config file**: `appConfigDir()/tipterm/config.json`
  - Auto-generated on first launch
  - Hot reload via Tauri watcher
  - Lightweight validation (invalid values fallback to defaults + warning)

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
- `react-arborist`: Virtualized tree view for file browser
- `@pierre/diffs`: Diff viewer with Shiki syntax highlighting (unified/split modes)
