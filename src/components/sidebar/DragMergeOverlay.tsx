import { SessionInfo, GROUP_COLORS } from '../../stores/sessionStore';
import { IconTerminal2, IconFolder } from "@/components/ui/icons";

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
        bg-bg-hover border-l-2 border-accent-primary
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
            <IconFolder className="w-4 h-4 text-text-secondary flex-shrink-0" stroke={2} />
            <span className="text-sm text-text-secondary truncate">
              Create group
            </span>
          </>
        ) : (
          <>
            {/* Terminal icon */}
            <IconTerminal2 className="w-4 h-4 text-text-secondary flex-shrink-0" stroke={2} />
            <span className="text-sm text-text-secondary truncate">
              {displayName}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
