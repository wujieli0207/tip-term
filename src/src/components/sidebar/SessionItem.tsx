import { SessionInfo, useSessionStore } from "../../stores/sessionStore";

interface SessionItemProps {
  session: SessionInfo;
  index: number;
}

export default function SessionItem({ session, index }: SessionItemProps) {
  const { activeSessionId, setActiveSession, closeSession } = useSessionStore();
  const isActive = activeSessionId === session.id;
  const shortcutNumber = index + 1;
  const showShortcut = shortcutNumber <= 9;

  // Display priority:
  // 1. Terminal title (set by program via OSC) - highest priority
  // 2. Current working directory (last component, skip if just "~")
  // 3. Process name
  // 4. Session name (fallback)
  const displayName = (() => {
    if (session.terminalTitle && session.terminalTitle !== '~') {
      return session.terminalTitle;
    }
    if (session.cwd && session.cwd !== '~') {
      const parts = session.cwd.split('/').filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    }
    if (session.processName) {
      return session.processName;
    }
    return session.name;
  })();

  const handleClick = () => {
    setActiveSession(session.id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeSession(session.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group flex items-center justify-between gap-2
        py-1.5 px-2 mx-1 rounded-lg cursor-pointer
        transition-colors duration-150
        ${isActive
          ? "bg-[#333333] border-l-2 border-purple-500"
          : "hover:bg-[#2a2a2a] border-l-2 border-transparent"
        }
      `}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm text-gray-300 truncate">{displayName}</span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {showShortcut && (
          <span className="text-xs text-gray-500 font-mono">
            ⌘{shortcutNumber}
          </span>
        )}
        <button
          onClick={handleClose}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#444444] transition-opacity duration-150"
          title="Close session"
        >
          <svg
            className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
