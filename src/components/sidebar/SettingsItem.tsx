import { useState } from 'react';
import { useSessionStore, SETTINGS_SESSION_ID } from "../../stores/sessionStore";
import { IconSettings, IconX } from "@/components/ui/icons";

export default function SettingsItem() {
  const {
    activeSessionId,
    setActiveSession,
    closeSettings,
  } = useSessionStore();

  const isActive = activeSessionId === SETTINGS_SESSION_ID;
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setActiveSession(SETTINGS_SESSION_ID);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeSettings();
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group flex items-center justify-between gap-2
        py-1.5 px-2 rounded-lg mx-1
        transition-all duration-150 cursor-pointer
        ${isActive
          ? "bg-[#333333] border-l-2 border-blue-500"
          : "hover:bg-[#2a2a2a] border-l-2 border-transparent"
        }
      `}
    >
      <div className="flex items-center flex-1 min-w-0 gap-2">
        <IconSettings className="w-4 h-4 text-gray-400 flex-shrink-0" stroke={2} />
        <span className="text-sm text-gray-300 truncate">Settings</span>
      </div>

      <div className="flex items-center flex-shrink-0 gap-1">
        {isHovered && (
          <button
            onClick={handleClose}
            className="p-0.5 rounded hover:bg-[#444444] transition-opacity duration-150"
            title="Close settings"
          >
            <IconX className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200" stroke={2} />
          </button>
        )}
      </div>
    </div>
  );
}
