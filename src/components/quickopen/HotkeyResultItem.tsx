import { HotkeyDefinition } from "../../types/hotkey";
import { formatBinding } from "../../utils/hotkeyUtils";

interface HotkeyResultItemProps {
  hotkey: HotkeyDefinition;
  isSelected: boolean;
  query: string;
  onClick: () => void;
  onMouseEnter: () => void;
}

export function HotkeyResultItem({
  hotkey,
  isSelected,
  onClick,
  onMouseEnter,
}: HotkeyResultItemProps) {
  const bindingStr = hotkey.currentBinding ? formatBinding(hotkey.currentBinding) : "";

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
        isSelected ? "bg-[#2a2a2a]" : "hover:bg-[#222]"
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <kbd className="px-2 py-0.5 bg-[#333] rounded text-xs text-gray-300 font-mono flex-shrink-0 min-w-[3rem] text-center">
        {bindingStr}
      </kbd>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{hotkey.label}</div>
        <div className="text-xs text-gray-500 truncate">{hotkey.description}</div>
      </div>
      <div className="text-xs text-gray-500 px-2 py-0.5 bg-[#222] rounded flex-shrink-0">
        {hotkey.category}
      </div>
    </div>
  );
}
