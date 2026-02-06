import { useState, useEffect, useRef } from "react";
import { HotkeyDefinition, HotkeyBinding } from "../../../types/hotkey";
import { useSettingsStore } from "../../../stores/settingsStore";
import { eventToBinding, checkConflict, isCustomized } from "../../../utils/hotkeyUtils";
import HotkeyBadge from "./HotkeyBadge";

interface HotkeyItemProps {
  hotkey: HotkeyDefinition;
}

// Special marker to indicate the user wants to clear the binding
const CLEAR_BINDING = Symbol("CLEAR_BINDING");

type PendingState = HotkeyBinding | typeof CLEAR_BINDING | null;

export default function HotkeyItem({ hotkey }: HotkeyItemProps) {
  const { hotkeys, setHotkeyBinding, clearHotkeyBinding, resetHotkey } = useSettingsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [pendingState, setPendingState] = useState<PendingState>(null);
  const [conflict, setConflict] = useState<HotkeyDefinition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isModified = isCustomized(hotkey.id, hotkeys.customizations);

  // Determine what to display
  const getDisplayBinding = (): HotkeyBinding | null => {
    if (pendingState === CLEAR_BINDING) return null;
    if (pendingState !== null) return pendingState;
    return hotkey.currentBinding;
  };

  const displayBinding = getDisplayBinding();

  // Handle click outside to cancel/save
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Save pending changes
        if (pendingState === CLEAR_BINDING) {
          clearHotkeyBinding(hotkey.id);
        } else if (pendingState && !conflict) {
          setHotkeyBinding(hotkey.id, pendingState);
        }
        setIsEditing(false);
        setPendingState(null);
        setConflict(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, pendingState, conflict, hotkey.id, setHotkeyBinding, clearHotkeyBinding]);

  // Handle key capture
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // ESC cancels editing
      if (e.key === "Escape") {
        setIsEditing(false);
        setPendingState(null);
        setConflict(null);
        return;
      }

      // Backspace or Delete clears the binding
      if (e.key === "Backspace" || e.key === "Delete") {
        setPendingState(CLEAR_BINDING);
        setConflict(null);
        return;
      }

      // Enter saves
      if (e.key === "Enter") {
        if (pendingState === CLEAR_BINDING) {
          clearHotkeyBinding(hotkey.id);
        } else if (pendingState && !conflict) {
          setHotkeyBinding(hotkey.id, pendingState);
        }
        setIsEditing(false);
        setPendingState(null);
        setConflict(null);
        return;
      }

      const binding = eventToBinding(e);
      if (!binding) return; // Ignore pure modifier presses

      // Require at least one modifier
      if (binding.modifiers.length === 0) return;

      setPendingState(binding);

      // Check for conflicts
      const conflictingHotkey = checkConflict(binding, hotkey.id, hotkeys.customizations);
      setConflict(conflictingHotkey ?? null);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isEditing, pendingState, conflict, hotkey.id, hotkeys.customizations, setHotkeyBinding, clearHotkeyBinding]);

  const handleStartEditing = () => {
    setIsEditing(true);
    setPendingState(null);
    setConflict(null);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetHotkey(hotkey.id);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-between py-3 px-4 hover:bg-bg-active rounded-lg group"
    >
      {/* Left side: label and description */}
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary">{hotkey.label}</span>
          {isModified && (
            <span className="text-[10px] px-1.5 py-0.5 bg-accent-primary/15 text-accent-primary rounded">
              Modified
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-0.5 truncate">{hotkey.description}</p>
      </div>

      {/* Right side: hotkey badge and actions */}
      <div className="flex items-center gap-2">
        {/* Reset button (only show if modified) */}
        {isModified && !isEditing && (
          <button
            onClick={handleReset}
            className="opacity-0 group-hover:opacity-100 text-xs text-text-muted hover:text-text-primary transition-opacity"
            title="Reset to default"
          >
            Reset
          </button>
        )}

        {/* Hotkey badge / edit area */}
        <div
          onClick={handleStartEditing}
          className={`min-w-[80px] flex items-center justify-center cursor-pointer rounded px-2 py-1 transition-colors ${
            isEditing
              ? "bg-bg-hover ring-1 ring-accent-primary"
              : "hover:bg-bg-hover"
          }`}
        >
          {isEditing && pendingState === null ? (
            <span className="text-xs text-text-secondary animate-pulse">Press keys...</span>
          ) : (
            <HotkeyBadge
              binding={displayBinding}
              isEditing={isEditing}
              isConflict={!!conflict}
            />
          )}
        </div>
      </div>

      {/* Conflict warning */}
      {conflict && (
        <div className="absolute right-4 top-full mt-1 text-xs text-accent-red bg-accent-red/15 px-2 py-1 rounded">
          Conflicts with: {conflict.label}
        </div>
      )}

      {/* Edit mode hint */}
      {isEditing && !conflict && (
        <div className="absolute right-4 top-full mt-1 text-xs text-text-muted">
          Press Backspace to remove
        </div>
      )}
    </div>
  );
}
