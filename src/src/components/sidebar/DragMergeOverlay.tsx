import { SessionInfo, GROUP_COLORS } from '../../stores/sessionStore';

interface DragMergeOverlayProps {
  session: SessionInfo;
  showMergePreview: boolean;
}

export default function DragMergeOverlay({ session, showMergePreview }: DragMergeOverlayProps) {
  // Display name logic (same as SessionItem)
  const displayName = (() => {
    if (session.customName) {
      return session.customName;
    }
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

  return (
    <div
      className={`
        flex items-center gap-2 py-1.5 px-2 rounded-lg
        bg-[#333333] border-l-2 border-purple-500
        shadow-lg cursor-grabbing
        transition-all duration-200
        ${showMergePreview ? 'scale-105' : ''}
      `}
      style={{
        width: 180,
        ...(showMergePreview && {
          borderColor: GROUP_COLORS.gray.border,
          backgroundColor: GROUP_COLORS.gray.bg,
        }),
      }}
    >
      <div className="flex items-center flex-1 min-w-0 gap-2">
        {showMergePreview ? (
          <>
            {/* Group icon when merging */}
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span className="text-sm text-gray-300 truncate">
              Create group
            </span>
          </>
        ) : (
          <>
            {/* Terminal icon */}
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
            <span className="text-sm text-gray-300 truncate">
              {displayName}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
