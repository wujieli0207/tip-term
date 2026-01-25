import { useState, useEffect, useRef } from "react";
import { HotkeyBinding } from "../../../types/hotkey";
import { eventToBinding } from "../../../utils/hotkeyUtils";
import HotkeyBadge from "./HotkeyBadge";

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
        className={`flex items-center bg-[#1a1a1a] border rounded-lg overflow-hidden transition-colors ${
          isKeyboardMode
            ? "border-purple-500 ring-1 ring-purple-500/30"
            : "border-[#2a2a2a] focus-within:border-[#3a3a3a]"
        }`}
      >
        {/* Search icon */}
        <div className="pl-3 text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input area */}
        <div className="flex-1 px-2">
          {isKeyboardMode ? (
            <div className="py-2 min-h-[36px] flex items-center">
              {bindingQuery ? (
                <HotkeyBadge binding={bindingQuery} />
              ) : (
                <span className="text-sm text-gray-400 animate-pulse">
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
              className="w-full py-2 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
            />
          )}
        </div>

        {/* Clear button */}
        {hasQuery && (
          <button
            onClick={clearSearch}
            className="px-2 text-gray-500 hover:text-gray-300 transition-colors"
            title="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Keyboard mode toggle */}
        <button
          onClick={toggleMode}
          className={`px-3 py-2 border-l transition-colors ${
            isKeyboardMode
              ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
              : "text-gray-500 hover:text-gray-300 border-[#2a2a2a] hover:bg-[#2a2a2a]"
          }`}
          title={isKeyboardMode ? "Switch to text search" : "Search by pressing keys"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeWidth={2}
              d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"
            />
          </svg>
        </button>
      </div>

      {/* Mode hint */}
      {isKeyboardMode && (
        <p className="absolute mt-1 text-xs text-gray-500">
          Press ESC to exit keyboard search
        </p>
      )}
    </div>
  );
}
