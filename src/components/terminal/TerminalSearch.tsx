import { memo, useCallback, useEffect, useRef } from "react";
import { IconX, IconChevronUp, IconChevronDown, IconLetterCase, IconRegex, IconTextWrap } from "@tabler/icons-react";
import { useTerminalSearchStore } from "../../stores/terminalSearchStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { findHotkeyByAction, formatBinding } from "../../utils/hotkeyUtils";
import {
  searchTerminal,
  searchNext,
  searchPrevious,
  clearSearch,
} from "../../terminal-core/api/terminalApi";

interface TerminalSearchProps {
  sessionId: string;
}

// Hoisted static JSX to avoid re-creation on each render (rendering-hoist-jsx)
const Divider = <div className="w-px h-4 bg-border/40 mx-1" />;

function TerminalSearch({ sessionId }: TerminalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isOpen,
    activeSessionId,
    query,
    caseSensitive,
    wholeWord,
    regex,
    currentMatch,
    matchCount,
    setQuery,
    toggleCaseSensitive,
    toggleWholeWord,
    toggleRegex,
    close,
  } = useTerminalSearchStore();
  const hotkeyCustomizations = useSettingsStore((state) => state.hotkeys.customizations);

  const getHotkeyLabel = (action: string) => {
    const found = findHotkeyByAction(action, hotkeyCustomizations);
    if (!found?.currentBinding) return "Unassigned";
    return formatBinding(found.currentBinding);
  };

  // Only show if this session is the active search session
  const isVisible = isOpen && activeSessionId === sessionId;

  // Focus input when search opens
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isVisible]);

  // Perform search when query or options change
  useEffect(() => {
    if (!isVisible) return;

    if (query) {
      searchTerminal(sessionId, query, { caseSensitive, wholeWord, regex });
    } else {
      clearSearch(sessionId);
    }
  }, [isVisible, sessionId, query, caseSensitive, wholeWord, regex]);

  // Clear search when closing
  useEffect(() => {
    if (!isVisible) {
      clearSearch(sessionId);
    }
  }, [isVisible, sessionId]);

  const handleFindNext = useCallback(() => {
    if (query) {
      searchNext(sessionId, query, { caseSensitive, wholeWord, regex });
    }
  }, [sessionId, query, caseSensitive, wholeWord, regex]);

  const handleFindPrevious = useCallback(() => {
    if (query) {
      searchPrevious(sessionId, query, { caseSensitive, wholeWord, regex });
    }
  }, [sessionId, query, caseSensitive, wholeWord, regex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        handleFindPrevious();
      } else {
        handleFindNext();
        }
      }
    },
    [close, handleFindNext, handleFindPrevious]
  );

  const handleClose = useCallback(() => {
    close();
  }, [close]);

  if (!isVisible) return null;

  return (
    <div className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-md border border-border/60 bg-[hsl(var(--bg-card))] shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Search... (${getHotkeyLabel("terminalSearch")})`}
        className="w-48 px-2 py-1 text-sm bg-transparent border-none outline-none text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]"
      />

      {/* Case sensitive toggle */}
      <button
        type="button"
        onClick={toggleCaseSensitive}
        className={`p-1 rounded hover:bg-[hsl(var(--bg-hover))] transition-colors ${
          caseSensitive
            ? "text-[hsl(var(--accent-primary))]"
            : "text-[hsl(var(--text-muted))]"
        }`}
        title={`Match Case (${getHotkeyLabel("terminalSearchToggleCase")})`}
      >
        <IconLetterCase size={16} />
      </button>

      {/* Regex toggle */}
      <button
        type="button"
        onClick={toggleRegex}
        className={`p-1 rounded hover:bg-[hsl(var(--bg-hover))] transition-colors ${
          regex
            ? "text-[hsl(var(--accent-primary))]"
            : "text-[hsl(var(--text-muted))]"
        }`}
        title={`Use Regular Expression (${getHotkeyLabel("terminalSearchToggleRegex")})`}
      >
        <IconRegex size={16} />
      </button>

      {/* Whole word toggle */}
      <button
        type="button"
        onClick={toggleWholeWord}
        className={`p-1 rounded hover:bg-[hsl(var(--bg-hover))] transition-colors ${
          wholeWord
            ? "text-[hsl(var(--accent-primary))]"
            : "text-[hsl(var(--text-muted))]"
        }`}
        title={`Match Whole Word (${getHotkeyLabel("terminalSearchToggleWholeWord")})`}
      >
        <IconTextWrap size={16} />
      </button>

      {Divider}

      <div className="text-xs text-[hsl(var(--text-muted))] min-w-[48px] text-center">
        {matchCount > 0 ? `${currentMatch}/${matchCount}` : "0/0"}
      </div>

      {Divider}

      {/* Previous match */}
      <button
        type="button"
        onClick={handleFindPrevious}
        disabled={!query}
        className="p-1 rounded hover:bg-[hsl(var(--bg-hover))] transition-colors text-[hsl(var(--text-secondary))] disabled:opacity-40 disabled:cursor-not-allowed"
        title={`Previous Match (${getHotkeyLabel("terminalSearchPrev")})`}
      >
        <IconChevronUp size={16} />
      </button>

      {/* Next match */}
      <button
        type="button"
        onClick={handleFindNext}
        disabled={!query}
        className="p-1 rounded hover:bg-[hsl(var(--bg-hover))] transition-colors text-[hsl(var(--text-secondary))] disabled:opacity-40 disabled:cursor-not-allowed"
        title={`Next Match (${getHotkeyLabel("terminalSearchNext")})`}
      >
        <IconChevronDown size={16} />
      </button>

      {Divider}

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="p-1 rounded hover:bg-[hsl(var(--bg-hover))] transition-colors text-[hsl(var(--text-secondary))]"
        title="Close (Escape)"
      >
        <IconX size={16} />
      </button>
    </div>
  );
}

// Wrap with memo to prevent unnecessary re-renders (rerender-memo)
export default memo(TerminalSearch);
