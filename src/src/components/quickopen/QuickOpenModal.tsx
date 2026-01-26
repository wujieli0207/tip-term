import { useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useQuickOpenStore } from "../../stores/quickOpenStore";
import { SearchFileEntry } from "../../types/file";
import { useSessionStore } from "../../stores/sessionStore";
import { useEditorStore } from "../../stores/editorStore";
import { invoke } from "@tauri-apps/api/core";
import { ResultItem } from "./ResultItem";
import { SectionHeader } from "./SectionHeader";

export default function QuickOpenModal() {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedQueryRef = useRef<string>("");

  const {
    isOpen,
    query,
    results,
    selectedIndex,
    isLoading,
    close,
    setQuery,
    moveSelection,
    getSelectedFile,
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

  // Debounced search - only triggers when query actually changes
  useEffect(() => {
    if (!isOpen || !rootPath) return;

    const trimmedQuery = query.trim();

    // Skip if query hasn't changed
    if (trimmedQuery === lastSearchedQueryRef.current) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!trimmedQuery) {
      useQuickOpenStore.setState({ results: [], isLoading: false, selectedIndex: 0 });
      lastSearchedQueryRef.current = "";
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const searchQuery = trimmedQuery;
      lastSearchedQueryRef.current = searchQuery;

      useQuickOpenStore.setState({ isLoading: true });

      try {
        const searchResults = await invoke<SearchFileEntry[]>("search_files", {
          rootPath,
          query: searchQuery,
          maxResults: 50,
        });

        // Only update if this is still the current query
        if (lastSearchedQueryRef.current === searchQuery) {
          useQuickOpenStore.setState({
            results: searchResults,
            isLoading: false,
            selectedIndex: 0
          });
        }
      } catch (error) {
        console.error("Search failed:", error);
        if (lastSearchedQueryRef.current === searchQuery) {
          useQuickOpenStore.setState({ results: [], isLoading: false });
        }
      }
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isOpen, rootPath]);

  // Handle file selection
  const handleSelectFile = useCallback(
    (file: SearchFileEntry) => {
      if (!file.is_directory) {
        openFile(file.path);
        close();
      }
    },
    [openFile, close]
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
          const selected = getSelectedFile();
          if (selected) {
            handleSelectFile(selected);
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [moveSelection, getSelectedFile, handleSelectFile, close]
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
            placeholder={rootPath ? "Search files by name..." : "No active session"}
            disabled={!rootPath}
            className="w-full bg-[#252525] text-white text-sm px-3 py-2 rounded border border-[#444] focus:border-blue-500 focus:outline-none placeholder-gray-500 disabled:opacity-50"
          />
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <>
              {prefixResults.length > 0 && (
                <Fragment>
                  <SectionHeader title="file results" />
                  {prefixResults.map((file, index) => (
                    <ResultItem
                      key={file.path}
                      file={file}
                      isSelected={index === selectedIndex}
                      query={query}
                      onClick={() => handleSelectFile(file)}
                      onMouseEnter={() =>
                        useQuickOpenStore.setState({ selectedIndex: index })
                      }
                    />
                  ))}
                </Fragment>
              )}
              {containsResults.length > 0 && (
                <Fragment>
                  <SectionHeader title="other results" />
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
                          useQuickOpenStore.setState({ selectedIndex: globalIndex })
                        }
                      />
                    );
                  })}
                </Fragment>
              )}
            </>
          ) : query.trim() ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No files found
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Type to search files
            </div>
          )}
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
