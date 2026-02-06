import { useState, useMemo } from "react";
import { HotkeyBinding, HotkeyDefinition } from "../../../types/hotkey";
import { useSettingsStore } from "../../../stores/settingsStore";
import { getEffectiveHotkeys, filterByText, filterByBinding } from "../../../utils/hotkeyUtils";
import { HOTKEY_CATEGORIES } from "../../../config/defaultHotkeys";
import HotkeySearchBar from "../hotkey/HotkeySearchBar";
import HotkeyItem from "../hotkey/HotkeyItem";
import SettingsPageHeader from "../shared/SettingsPageHeader";
import SettingsSection from "../shared/SettingsSection";
import SettingsCard from "../shared/SettingsCard";

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
    <div className="space-y-8">
      <SettingsPageHeader
        title="Hotkeys"
        description="Search and customize keyboard shortcuts"
      />

      <SettingsSection title="Search & Manage" description="Find shortcuts or filter by key binding">
        <div className="flex items-center justify-end mb-4">
          {hasCustomizations && (
            <button
              onClick={resetAllHotkeys}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
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

        <SettingsCard className="p-2">
          <div className="space-y-6">
            {Object.entries(groupedHotkeys).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 px-4">
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
              <div className="text-center py-8 text-text-muted">
                {textQuery || bindingQuery
                  ? "No hotkeys match your search"
                  : "No hotkeys configured"}
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}
