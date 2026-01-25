import { useState, useMemo } from "react";
import { HotkeyBinding, HotkeyDefinition } from "../../../types/hotkey";
import { useSettingsStore } from "../../../stores/settingsStore";
import { getEffectiveHotkeys, filterByText, filterByBinding } from "../../../utils/hotkeyUtils";
import { HOTKEY_CATEGORIES } from "../../../config/defaultHotkeys";
import HotkeySearchBar from "../hotkey/HotkeySearchBar";
import HotkeyItem from "../hotkey/HotkeyItem";

export default function HotkeySection() {
  const { hotkeys, resetAllHotkeys } = useSettingsStore();
  const [textQuery, setTextQuery] = useState("");
  const [bindingQuery, setBindingQuery] = useState<HotkeyBinding | null>(null);

  // Get all hotkeys with current bindings
  const allHotkeys = useMemo(
    () => getEffectiveHotkeys(hotkeys.customizations),
    [hotkeys.customizations]
  );

  // Filter hotkeys based on search
  const filteredHotkeys = useMemo(() => {
    let result = allHotkeys;

    if (textQuery) {
      result = filterByText(result, textQuery);
    } else if (bindingQuery) {
      result = filterByBinding(result, bindingQuery);
    }

    return result;
  }, [allHotkeys, textQuery, bindingQuery]);

  // Group filtered hotkeys by category
  const groupedHotkeys = useMemo(() => {
    const groups: Record<string, HotkeyDefinition[]> = {};

    for (const category of HOTKEY_CATEGORIES) {
      const items = filteredHotkeys.filter((h) => h.category === category);
      if (items.length > 0) {
        groups[category] = items;
      }
    }

    return groups;
  }, [filteredHotkeys]);

  const hasCustomizations = Object.keys(hotkeys.customizations).length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-200">Hotkeys</h2>
        {hasCustomizations && (
          <button
            onClick={resetAllHotkeys}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset All
          </button>
        )}
      </div>

      <HotkeySearchBar
        textQuery={textQuery}
        bindingQuery={bindingQuery}
        onTextChange={setTextQuery}
        onBindingChange={setBindingQuery}
      />

      {/* Hotkey list grouped by category */}
      <div className="space-y-6">
        {Object.entries(groupedHotkeys).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-4">
              {category}
            </h3>
            <div className="space-y-0.5">
              {items.map((hotkey) => (
                <HotkeyItem key={hotkey.id} hotkey={hotkey} />
              ))}
            </div>
          </div>
        ))}

        {filteredHotkeys.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {textQuery || bindingQuery
              ? "No hotkeys match your search"
              : "No hotkeys configured"}
          </div>
        )}
      </div>
    </div>
  );
}
