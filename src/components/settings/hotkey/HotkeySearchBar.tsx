import { useState, useEffect, useRef } from "react";
import { HotkeyBinding } from "../../../types/hotkey";
import { eventToBinding } from "../../../utils/hotkeyUtils";
import HotkeyBadge from "./HotkeyBadge";
import { IconSearch, IconX, IconKeyboard } from "@/components/ui/icons";

interface HotkeySearchBarProps {
  textQuery: string;
  bindingQuery: HotkeyBinding | null;
  onTextChange: (query: string) => void;
  onBindingChange: (binding: HotkeyBinding | null) => void;
}

export default function HotkeySearchBar({
  textQuery,
  bindingQuery,
  onTextChange,
  onBindingChange,
}: HotkeySearchBarProps) {
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle between text and keyboard search modes
  const toggleMode = () => {
    const newMode = !isKeyboardMode;
    setIsKeyboardMode(newMode);

    if (newMode) {
      // Entering keyboard mode - clear text query
      onTextChange("");
    } else {
      // Exiting keyboard mode - clear binding query
      onBindingChange(null);
    }
  };

  // Handle keyboard capture in keyboard mode
  useEffect(() => {
    if (!isKeyboardMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Escape to exit keyboard mode
      if (e.key === "Escape") {
        setIsKeyboardMode(false);
        onBindingChange(null);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const binding = eventToBinding(e);
      if (binding) {
        onBindingChange(binding);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isKeyboardMode, onBindingChange]);

  // Handle click outside to exit keyboard mode
  useEffect(() => {
    if (!isKeyboardMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsKeyboardMode(false);
        onBindingChange(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isKeyboardMode, onBindingChange]);

  const clearSearch = () => {
    onTextChange("");
    onBindingChange(null);
    setIsKeyboardMode(false);
    inputRef.current?.focus();
  };

  const hasQuery = textQuery.length > 0 || bindingQuery !== null;

  return (
    <div ref={containerRef} className="relative mb-6">
      <div
        className={`flex items-center bg-bg-active border rounded-lg overflow-hidden transition-colors ${
          isKeyboardMode
            ? "border-accent-primary ring-1 ring-accent-primary/30"
            : "border-border-subtle focus-within:border-border"
        }`}
      >
        {/* Search icon */}
        <div className="pl-3 text-text-muted">
          <IconSearch className="w-4 h-4" stroke={2} />
        </div>

        {/* Input area */}
        <div className="flex-1 px-2">
          {isKeyboardMode ? (
            <div className="py-2 min-h-[36px] flex items-center">
              {bindingQuery ? (
                <HotkeyBadge binding={bindingQuery} />
              ) : (
                <span className="text-sm text-text-secondary animate-pulse">
                  Press a key combination...
                </span>
              )}
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={textQuery}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Search hotkeys..."
              className="w-full py-2 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          )}
        </div>

        {/* Clear button */}
        {hasQuery && (
          <button
            onClick={clearSearch}
            className="px-2 text-text-muted hover:text-text-primary transition-colors"
            title="Clear search"
          >
            <IconX className="w-4 h-4" stroke={2} />
          </button>
        )}

        {/* Keyboard mode toggle */}
        <button
          onClick={toggleMode}
          className={`px-3 py-2 border-l transition-colors ${
            isKeyboardMode
              ? "bg-accent-primary/15 text-accent-primary border-accent-primary/30"
              : "text-text-muted hover:text-text-primary border-border-subtle hover:bg-bg-hover"
          }`}
          title={isKeyboardMode ? "Switch to text search" : "Search by pressing keys"}
        >
          <IconKeyboard className="w-4 h-4" stroke={2} />
        </button>
      </div>

      {/* Mode hint */}
      {isKeyboardMode && (
        <p className="absolute mt-1 text-xs text-text-muted">
          Press ESC to exit keyboard search
        </p>
      )}
    </div>
  );
}
