import { useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useQuickOpenStore } from "../../stores/quickOpenStore";
import type { RecentItem } from "../../stores/quickOpenStore";
import { SearchFileEntry } from "../../types/file";
import { useSessionStore } from "../../stores/sessionStore";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { useSplitPaneStore } from "../../stores/splitPaneStore";
import { invoke } from "@tauri-apps/api/core";
import { ResultItem } from "./ResultItem";
import { HotkeyResultItem } from "./HotkeyResultItem";
import { RecentSearches } from "./RecentSearches";
import { SectionHeader } from "./SectionHeader";
import { getEffectiveHotkeys } from "../../utils/hotkeyUtils";
import type { HotkeyDefinition } from "../../types/hotkey";

type FilterType = "all" | "files" | "hotkeys";

const FILTER_TABS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "files", label: "Files" },
  { id: "hotkeys", label: "Hotkeys" },
];

export default function QuickOpenModal() {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedQueryRef = useRef<string>("");
  const resultsListRef = useRef<HTMLDivElement>(null);

  const {
    isOpen,
    query,
    results,
    selectedIndex,
    isLoading,
    filterType,
    recentSearches,
    hotkeyResults,
    hotkeySelectedIndex,
    close,
    setQuery,
    setFilterType,
    moveSelection,
    getSelectedFile,
    getSelectedHotkey,
    addRecentFile,
    addRecentHotkey,
  } = useQuickOpenStore();

  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const { openFile } = useEditorStore();

  // Memoize root path to prevent unnecessary re-renders
  const rootPath = useMemo(() => {
    if (!activeSessionId) return null;
    const session = sessions.get(activeSessionId);
    return session?.cwd || null;
  }, [activeSessionId, sessions]);

  // Group results by match_type
  const { prefixResults, containsResults } = useMemo(() => {
    const prefix = results.filter((f) => f.match_type === "prefix");
    const contains = results.filter((f) => f.match_type === "contains");
    return { prefixResults: prefix, containsResults: contains };
  }, [results]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      lastSearchedQueryRef.current = "";
    }
  }, [isOpen]);

  // Debounced search for files and hotkeys
  useEffect(() => {
    if (!isOpen) return;

    const trimmedQuery = query.trim();

    // Skip if query hasn't changed
    if (trimmedQuery === lastSearchedQueryRef.current) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!trimmedQuery) {
      useQuickOpenStore.setState({ results: [], hotkeyResults: [], isLoading: false, selectedIndex: 0, hotkeySelectedIndex: 0 });
      lastSearchedQueryRef.current = "";
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const searchQuery = trimmedQuery;
      lastSearchedQueryRef.current = searchQuery;

      useQuickOpenStore.setState({ isLoading: true });

      // Search files
      if (filterType === "all" || filterType === "files") {
        if (rootPath) {
          try {
            const fileResults = await invoke<SearchFileEntry[]>("search_files", {
              rootPath,
              query: searchQuery,
              maxResults: 50,
            });

            if (lastSearchedQueryRef.current === searchQuery) {
              useQuickOpenStore.setState({ results: fileResults });
            }
          } catch (error) {
            console.error("Search failed:", error);
            if (lastSearchedQueryRef.current === searchQuery) {
              useQuickOpenStore.setState({ results: [] });
            }
          }
        } else {
          useQuickOpenStore.setState({ results: [] });
        }
      } else {
        useQuickOpenStore.setState({ results: [] });
      }

      // Search hotkeys
      if (filterType === "all" || filterType === "hotkeys") {
        const { hotkeys } = useSettingsStore.getState();
        const effectiveHotkeys = getEffectiveHotkeys(hotkeys.customizations);
        const filtered = effectiveHotkeys.filter((h) => {
          if (!h.currentBinding) return false;
          const lowerQuery = searchQuery.toLowerCase();
          return (
            h.label.toLowerCase().includes(lowerQuery) ||
            h.description.toLowerCase().includes(lowerQuery) ||
            h.category.toLowerCase().includes(lowerQuery)
          );
        });

        if (lastSearchedQueryRef.current === searchQuery) {
          useQuickOpenStore.setState({ hotkeyResults: filtered });
        }
      } else {
        useQuickOpenStore.setState({ hotkeyResults: [] });
      }

      if (lastSearchedQueryRef.current === searchQuery) {
        useQuickOpenStore.setState({ isLoading: false, selectedIndex: 0, hotkeySelectedIndex: 0 });
      }
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isOpen, rootPath, filterType]);

  // Handle file selection
  const handleSelectFile = useCallback(
    (file: SearchFileEntry) => {
      if (!file.is_directory) {
        addRecentFile(file.path, file.name);
        openFile(file.path);
        close();
      }
    },
    [openFile, close, addRecentFile]
  );

  // Handle hotkey execution
  const handleExecuteHotkey = useCallback(
    (hotkey: HotkeyDefinition) => {
      addRecentHotkey(hotkey);
      executeHotkeyAction(hotkey.action);
      close();
    },
    [close, addRecentHotkey]
  );

  // Execute hotkey action
  const executeHotkeyAction = useCallback((action: string) => {
    const sessionStore = useSessionStore.getState();
    const sidebarStore = useSidebarStore.getState();
    const editorStore = useEditorStore.getState();
    const splitPaneStore = useSplitPaneStore.getState();
    const gitStore = useGitStore.getState();

    const handlers: Record<string, () => void> = {
      openSettings: () => sessionStore.openSettings(),
      quickOpen: () => { /* Already in quick open */ },
      newSession: () => sessionStore.createSession().catch(console.error),
      closeSession: () => {
        const isEditorFocused = document.activeElement?.closest(".cm-editor") !== null;
        if (editorStore.editorVisible && editorStore.activeFilePath && isEditorFocused) {
          editorStore.closeActiveFile();
        } else if (sessionStore.activeSessionId && !sessionStore.isSettingsSession(sessionStore.activeSessionId)) {
          const rootSessionId = sessionStore.activeSessionId;
          const layout = splitPaneStore.getLayout(rootSessionId);
          if (layout) {
            const paneSessionId = splitPaneStore.closePane(rootSessionId, layout.focusedPaneId);
            if (paneSessionId) {
              invoke("close_session", { id: paneSessionId }).catch(console.error);
            }
            if (!splitPaneStore.hasLayout(rootSessionId)) {
              sessionStore.closeSession(rootSessionId).catch(console.error);
            }
          } else {
            sessionStore.closeSession(rootSessionId).catch(console.error);
          }
        }
      },
      toggleSidebar: () => sidebarStore.toggle(),
      toggleFileTree: () => sidebarStore.setActiveTab("filetree"),
      toggleEditor: () => editorStore.toggleEditorVisible(),
      toggleGitPanel: () => {
        sidebarStore.setActiveTab("git");
        if (sessionStore.activeSessionId) {
          const session = sessionStore.sessions.get(sessionStore.activeSessionId);
          if (session?.cwd) {
            gitStore.loadGitStatus(sessionStore.activeSessionId, session.cwd);
          }
        }
      },
      saveFile: () => {
        if (editorStore.editorVisible && editorStore.activeFilePath) {
          editorStore.saveActiveFile().catch(console.error);
        }
      },
      switchToSessionTab: () => sidebarStore.setActiveTab("session"),
      switchToFileTreeTab: () => sidebarStore.setActiveTab("filetree"),
      switchToGitTab: () => sidebarStore.setActiveTab("git"),
      splitVertical: () => {
        if (!sessionStore.activeSessionId || sessionStore.isSettingsSession(sessionStore.activeSessionId)) return;
        const rootSessionId = sessionStore.activeSessionId;
        invoke<string>("create_session", { shell: "/bin/zsh" })
          .then((newSessionId) => {
            const layout = splitPaneStore.getLayout(rootSessionId);
            if (!layout) {
              splitPaneStore.initLayout(rootSessionId, rootSessionId);
              const newLayout = splitPaneStore.getLayout(rootSessionId);
              if (newLayout) {
                splitPaneStore.splitPane(rootSessionId, newLayout.focusedPaneId, "horizontal", newSessionId);
              }
            } else {
              splitPaneStore.splitPane(rootSessionId, layout.focusedPaneId, "horizontal", newSessionId);
            }
          })
          .catch(console.error);
      },
      splitHorizontal: () => {
        if (!sessionStore.activeSessionId || sessionStore.isSettingsSession(sessionStore.activeSessionId)) return;
        const rootSessionId = sessionStore.activeSessionId;
        invoke<string>("create_session", { shell: "/bin/zsh" })
          .then((newSessionId) => {
            const layout = splitPaneStore.getLayout(rootSessionId);
            if (!layout) {
              splitPaneStore.initLayout(rootSessionId, rootSessionId);
              const newLayout = splitPaneStore.getLayout(rootSessionId);
              if (newLayout) {
                splitPaneStore.splitPane(rootSessionId, newLayout.focusedPaneId, "vertical", newSessionId);
              }
            } else {
              splitPaneStore.splitPane(rootSessionId, layout.focusedPaneId, "vertical", newSessionId);
            }
          })
          .catch(console.error);
      },
      navigatePaneUp: () => {
        if (sessionStore.activeSessionId) splitPaneStore.navigateFocus(sessionStore.activeSessionId, "up");
      },
      navigatePaneDown: () => {
        if (sessionStore.activeSessionId) splitPaneStore.navigateFocus(sessionStore.activeSessionId, "down");
      },
      navigatePaneLeft: () => {
        if (sessionStore.activeSessionId) splitPaneStore.navigateFocus(sessionStore.activeSessionId, "left");
      },
      navigatePaneRight: () => {
        if (sessionStore.activeSessionId) splitPaneStore.navigateFocus(sessionStore.activeSessionId, "right");
      },
    };

    const handler = handlers[action];
    if (handler) handler();
  }, []);

  // Handle recent search selection
  const handleSelectRecent = useCallback(
    (item: RecentItem) => {
      if (item.type === "file" && item.filePath) {
        // For files, open them directly
        openFile(item.filePath);
        close();
      } else if (item.type === "hotkey" && item.hotkeyId) {
        // For hotkeys, execute them directly
        const { hotkeys } = useSettingsStore.getState();
        const effectiveHotkeys = getEffectiveHotkeys(hotkeys.customizations);
        const hotkey = effectiveHotkeys.find((h) => h.id === item.hotkeyId);
        if (hotkey) {
          addRecentHotkey(hotkey);
          executeHotkeyAction(hotkey.action);
          close();
        }
      }
    },
    [openFile, close, addRecentHotkey]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          moveSelection("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          moveSelection("down");
          break;
        case "Enter":
          e.preventDefault();
          if (query.trim()) {
            const selectedFile = getSelectedFile();
            const selectedHotkey = getSelectedHotkey();
            if (selectedFile) {
              handleSelectFile(selectedFile);
            } else if (selectedHotkey) {
              handleExecuteHotkey(selectedHotkey);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [moveSelection, getSelectedFile, getSelectedHotkey, handleSelectFile, handleExecuteHotkey, close, query]
  );

  // Handle click outside to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        close();
      }
    },
    [close]
  );

  // Calculate item counts for display
  const fileCount = filterType === "hotkeys" ? 0 : results.length;
  const hotkeyCount = filterType === "files" ? 0 : hotkeyResults.length;
  const recentCount = recentSearches.length;
  const hasQuery = query.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-xl bg-[#1a1a1a] rounded-lg shadow-2xl border border-[#333] overflow-hidden">
        {/* Search Input */}
        <div className="p-3 border-b border-[#333]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={rootPath ? "Search files or hotkeys..." : "No active session"}
            disabled={!rootPath}
            className="w-full bg-[#252525] text-white text-sm px-3 py-2 rounded border border-[#444] focus:border-blue-500 focus:outline-none placeholder-gray-500 disabled:opacity-50"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-[#333]">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                filterType === tab.id
                  ? "text-white bg-[#2a2a2a] border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-[#222]"
              }`}
            >
              {tab.label}
              {((tab.id === "all" && fileCount + hotkeyCount > 0) ||
                (tab.id === "files" && fileCount > 0) ||
                (tab.id === "hotkeys" && hotkeyCount > 0)) && (
                <span className="ml-1 text-xs text-gray-500">
                  {tab.id === "all"
                    ? fileCount + hotkeyCount
                    : tab.id === "files"
                    ? fileCount
                    : hotkeyCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div ref={resultsListRef} className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Searching...
            </div>
          ) : !hasQuery && recentCount > 0 ? (
            <RecentSearches recentSearches={recentSearches} onSelect={handleSelectRecent} />
          ) : hasQuery && (fileCount > 0 || hotkeyCount > 0) ? (
            <>
              {/* File Results */}
              {fileCount > 0 && (
                <Fragment>
                  {prefixResults.length > 0 && (
                    <Fragment>
                      <SectionHeader title="files" />
                      {prefixResults.map((file, index) => (
                        <ResultItem
                          key={file.path}
                          file={file}
                          isSelected={index === selectedIndex}
                          query={query}
                          onClick={() => handleSelectFile(file)}
                          onMouseEnter={() =>
                            useQuickOpenStore.setState({ selectedIndex: index, hotkeySelectedIndex: 0 })
                          }
                        />
                      ))}
                    </Fragment>
                  )}
                  {containsResults.length > 0 && (
                    <Fragment>
                      <SectionHeader title="other" />
                      {containsResults.map((file, index) => {
                        const globalIndex = prefixResults.length + index;
                        return (
                          <ResultItem
                            key={file.path}
                            file={file}
                            isSelected={globalIndex === selectedIndex}
                            query={query}
                            onClick={() => handleSelectFile(file)}
                            onMouseEnter={() =>
                              useQuickOpenStore.setState({
                                selectedIndex: globalIndex,
                                hotkeySelectedIndex: 0,
                              })
                            }
                          />
                        );
                      })}
                    </Fragment>
                  )}
                </Fragment>
              )}

              {/* Hotkey Results */}
              {hotkeyCount > 0 && (
                <Fragment>
                  <SectionHeader title="hotkeys" />
                  {hotkeyResults.map((hotkey, index) => (
                    <HotkeyResultItem
                      key={hotkey.id}
                      hotkey={hotkey}
                      isSelected={index === hotkeySelectedIndex}
                      query={query}
                      onClick={() => handleExecuteHotkey(hotkey)}
                      onMouseEnter={() =>
                        useQuickOpenStore.setState({
                          hotkeySelectedIndex: index,
                          selectedIndex: 0,
                        })
                      }
                    />
                  ))}
                </Fragment>
              )}
            </>
          ) : hasQuery ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No results found
            </div>
          ) : recentCount === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Type to search files or hotkeys
            </div>
          ) : null}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-[#333] text-xs text-gray-500 flex gap-4">
          <span>
            <kbd className="px-1 py-0.5 bg-[#333] rounded text-gray-400">↑↓</kbd>{" "}
            Navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-[#333] rounded text-gray-400">Enter</kbd>{" "}
            Open
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-[#333] rounded text-gray-400">Esc</kbd>{" "}
            Close
          </span>
        </div>
      </div>
    </div>
  );
}

// Import useGitStore at the bottom to avoid circular dependency
import { useGitStore } from "../../stores/gitStore";
