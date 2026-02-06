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
        group relative flex items-center justify-between gap-2
        h-10 px-2.5 rounded-md
        transition-all duration-150 cursor-pointer
        ${isActive
          ? "bg-bg-active"
          : "hover:bg-bg-hover"
        }
      `}
    >
      <span
        className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full ${
          isActive ? "bg-accent-primary" : "bg-transparent"
        }`}
      />
      <div className="flex items-center flex-1 min-w-0 gap-2">
        <IconSettings
          className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-accent-primary" : "text-text-muted"}`}
          stroke={2}
        />
        <span className={`text-sm truncate ${isActive ? "text-text-primary" : "text-text-secondary"}`}>
          Settings
        </span>
      </div>

      <div className="flex items-center flex-shrink-0 gap-1">
        {isHovered && (
          <button
            onClick={handleClose}
            className="p-0.5 rounded hover:bg-bg-hover transition-opacity duration-150"
            title="Close settings"
          >
            <IconX className="w-3.5 h-3.5 text-text-secondary hover:text-text-primary" stroke={2} />
          </button>
        )}
      </div>
    </div>
  );
}
