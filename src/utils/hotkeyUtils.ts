import { HotkeyBinding, HotkeyDefinition, HotkeyCustomization, ModifierKey } from "../types/hotkey";
import { DEFAULT_HOTKEYS } from "../config/defaultHotkeys";

/**
 * Compare two hotkey bindings for equality
 */
export function bindingsMatch(a: HotkeyBinding, b: HotkeyBinding): boolean {
  if (a.key.toLowerCase() !== b.key.toLowerCase()) return false;
  if (a.modifiers.length !== b.modifiers.length) return false;

  const sortedA = [...a.modifiers].sort();
  const sortedB = [...b.modifiers].sort();

  return sortedA.every((mod, i) => mod === sortedB[i]);
}

/**
 * Format a hotkey binding for display
 * e.g., { key: "t", modifiers: ["meta"] } -> "⌘T"
 */
export function formatBinding(binding: HotkeyBinding): string {
  const modifierSymbols: Record<ModifierKey, string> = {
    meta: "⌘",
    ctrl: "⌃",
    alt: "⌥",
    shift: "⇧",
  };

  // Order: Ctrl, Alt, Shift, Meta
  const order: ModifierKey[] = ["ctrl", "alt", "shift", "meta"];
  const sortedMods = [...binding.modifiers].sort((a, b) => order.indexOf(a) - order.indexOf(b));

  const modStr = sortedMods.map((m) => modifierSymbols[m]).join("");
  const keyStr = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;

  return `${modStr}${keyStr}`;
}

/**
 * Convert a KeyboardEvent to a HotkeyBinding
 */
export function eventToBinding(e: KeyboardEvent): HotkeyBinding | null {
  // Ignore pure modifier key presses
  if (["Meta", "Control", "Alt", "Shift"].includes(e.key)) {
    return null;
  }

  const modifiers: ModifierKey[] = [];
  if (e.metaKey) modifiers.push("meta");
  if (e.ctrlKey) modifiers.push("ctrl");
  if (e.altKey) modifiers.push("alt");
  if (e.shiftKey) modifiers.push("shift");

  // On macOS, Option+key produces special characters (e.g., Option+C = ç)
  // Use e.code to get the physical key when Alt is pressed
  let key = e.key.toLowerCase();
  if (e.altKey && e.code.startsWith("Key")) {
    // e.code is like "KeyC" -> extract "c"
    key = e.code.slice(3).toLowerCase();
  } else if (e.altKey && e.code.startsWith("Digit")) {
    // e.code is like "Digit1" -> extract "1"
    key = e.code.slice(5);
  }

  return {
    key,
    modifiers,
  };
}

/**
 * Get all effective hotkeys by merging default and custom configurations
 * Note: currentBinding can be null if the hotkey has been disabled
 */
export function getEffectiveHotkeys(customizations: HotkeyCustomization): HotkeyDefinition[] {
  return DEFAULT_HOTKEYS.map((def) => ({
    ...def,
    // If the id exists in customizations, use that value (even if null)
    // Otherwise use the default binding
    currentBinding: def.id in customizations ? customizations[def.id] : def.defaultBinding,
  }));
}

/**
 * Find hotkey definition by action name
 */
export function findHotkeyByAction(
  action: string,
  customizations: HotkeyCustomization
): HotkeyDefinition | undefined {
  const hotkeys = getEffectiveHotkeys(customizations);
  return hotkeys.find((h) => h.action === action);
}

/**
 * Find hotkey definition that matches a binding
 */
export function findHotkeyByBinding(
  binding: HotkeyBinding,
  customizations: HotkeyCustomization
): HotkeyDefinition | undefined {
  const hotkeys = getEffectiveHotkeys(customizations);
  return hotkeys.find((h) => h.currentBinding && bindingsMatch(h.currentBinding, binding));
}

/**
 * Check if a binding conflicts with existing hotkeys
 * Returns the conflicting hotkey if found, undefined otherwise
 */
export function checkConflict(
  binding: HotkeyBinding,
  excludeId: string,
  customizations: HotkeyCustomization
): HotkeyDefinition | undefined {
  const hotkeys = getEffectiveHotkeys(customizations);
  return hotkeys.find(
    (h) => h.id !== excludeId && h.currentBinding && bindingsMatch(h.currentBinding, binding)
  );
}

/**
 * Check if a binding has been customized (different from default)
 */
export function isCustomized(id: string, customizations: HotkeyCustomization): boolean {
  return id in customizations;
}

/**
 * Filter hotkeys by text search
 */
export function filterByText(hotkeys: HotkeyDefinition[], query: string): HotkeyDefinition[] {
  const lowerQuery = query.toLowerCase();
  return hotkeys.filter(
    (h) =>
      h.label.toLowerCase().includes(lowerQuery) ||
      h.description.toLowerCase().includes(lowerQuery) ||
      h.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter hotkeys by binding search
 */
export function filterByBinding(hotkeys: HotkeyDefinition[], binding: HotkeyBinding): HotkeyDefinition[] {
  return hotkeys.filter((h) => {
    // Skip disabled hotkeys
    if (!h.currentBinding) return false;

    // Check if the search binding is a subset of the hotkey binding
    const hasAllModifiers = binding.modifiers.every((m) =>
      h.currentBinding!.modifiers.includes(m)
    );
    const keyMatches =
      binding.key === "" ||
      h.currentBinding!.key.toLowerCase() === binding.key.toLowerCase();

    return hasAllModifiers && keyMatches;
  });
}
