import { HotkeyBinding, ModifierKey } from "../../../types/hotkey";

interface HotkeyBadgeProps {
  binding: HotkeyBinding | null;
  isEditing?: boolean;
  isConflict?: boolean;
}

const modifierSymbols: Record<ModifierKey, string> = {
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
  meta: "⌘",
};

// Order: Ctrl, Alt, Shift, Meta
const modifierOrder: ModifierKey[] = ["ctrl", "alt", "shift", "meta"];

export default function HotkeyBadge({ binding, isEditing, isConflict }: HotkeyBadgeProps) {
  const baseClasses = "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono";

  // Handle null/disabled binding
  if (!binding) {
    const disabledClasses = isEditing
      ? "bg-accent-primary/20 text-accent-primary ring-1 ring-accent-primary"
      : "bg-bg-active text-text-muted italic";
    return (
      <span className={`${baseClasses} ${disabledClasses}`}>
        None
      </span>
    );
  }

  const sortedMods = [...binding.modifiers].sort(
    (a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b)
  );

  const keyDisplay = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;

  const stateClasses = isEditing
    ? "bg-accent-primary/20 text-accent-primary ring-1 ring-accent-primary"
    : isConflict
    ? "bg-accent-red/20 text-accent-red ring-1 ring-accent-red/60"
    : "bg-bg-hover text-text-secondary";

  return (
    <span className={`${baseClasses} ${stateClasses}`}>
      {sortedMods.map((mod) => (
        <span key={mod} className="opacity-80">
          {modifierSymbols[mod]}
        </span>
      ))}
      <span>{keyDisplay}</span>
    </span>
  );
}
