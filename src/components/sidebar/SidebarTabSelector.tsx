import { useSidebarStore, SidebarTab } from "../../stores/sidebarStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { IconTerminal2, IconFolder, IconGitBranch } from "@/components/ui/icons";
import { Tooltip } from "../ui/tooltip";
import { getEffectiveHotkeys, formatBinding } from "../../utils/hotkeyUtils";

interface TabButtonProps {
  icon: React.ComponentType<{ className?: string; stroke?: number | string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  hotkey?: string;
}

function TabButton({ icon: Icon, label, isActive, onClick, hotkey }: TabButtonProps) {
  const tooltip = hotkey ? `${label} (${hotkey})` : label;

  return (
    <Tooltip content={tooltip}>
      <button
        onClick={onClick}
        className={`p-2 rounded transition-colors ${
          isActive
            ? "bg-[#2a2a2a] text-white"
            : "text-gray-400 hover:text-gray-200 hover:bg-[#222]"
        }`}
      >
        <Icon className="w-4 h-4" stroke={2} />
      </button>
    </Tooltip>
  );
}

export default function SidebarTabSelector() {
  const { activeTab, setActiveTab } = useSidebarStore();
  const { hotkeys } = useSettingsStore();
  const effectiveHotkeys = getEffectiveHotkeys(hotkeys.customizations);

  // Helper to get hotkey string for an action
  const getHotkeyForAction = (action: string): string | undefined => {
    const hotkey = effectiveHotkeys.find((h) => h.action === action);
    return hotkey?.currentBinding ? formatBinding(hotkey.currentBinding) : undefined;
  };

  const tabs: {
    tab: SidebarTab;
    icon: typeof IconTerminal2;
    label: string;
    action: string;
  }[] = [
    { tab: 'session', icon: IconTerminal2, label: 'Session', action: 'switchToSessionTab' },
    { tab: 'filetree', icon: IconFolder, label: 'Files', action: 'switchToFileTreeTab' },
    { tab: 'git', icon: IconGitBranch, label: 'Git', action: 'switchToGitTab' },
  ];

  return (
    <div className="flex items-center gap-0.5">
      {tabs.map(({ tab, icon, label, action }) => (
        <TabButton
          key={tab}
          icon={icon}
          label={label}
          isActive={activeTab === tab}
          onClick={() => setActiveTab(tab)}
          hotkey={getHotkeyForAction(action)}
        />
      ))}
    </div>
  );
}
