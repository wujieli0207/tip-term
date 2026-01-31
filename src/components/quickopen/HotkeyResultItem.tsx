import { Keyboard } from "lucide-react";
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
      className={`
        h-[52px] rounded-lg px-3 cursor-pointer flex items-center gap-3
        ${isSelected ? "bg-accent-primary" : ""}
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {/* Icon Container */}
      <div
        className={`
          w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
          ${isSelected ? "bg-white/20" : "bg-hover"}
        `}
      >
        <Keyboard className={`w-[18px] h-[18px] ${isSelected ? "text-white" : "text-accent-cyan"}`} />
      </div>

      {/* Text Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className={`text-[14px] font-sans font-medium truncate ${isSelected ? "text-white" : "text-primary"}`}>
          {hotkey.label}
        </div>
        <div className={`text-xs font-mono truncate ${isSelected ? "text-white/60" : "text-text-secondary"}`}>
          {bindingStr}
        </div>
      </div>

      {/* Enter Symbol */}
      {isSelected && (
        <div className="text-white/50 text-sm flex-shrink-0">↵</div>
      )}
    </div>
  );
}
