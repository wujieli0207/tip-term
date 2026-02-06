import { useFileTreeStore } from "../../stores/fileTreeStore";
import { useSessionStore } from "../../stores/sessionStore";
import { IconFolderFilled, IconRefresh } from "@/components/ui/icons";

interface FileTreeHeaderProps {
  sessionId: string;
}

export default function FileTreeHeader({ sessionId }: FileTreeHeaderProps) {
  const { refreshRoot } = useFileTreeStore();
  const { sessions } = useSessionStore();

  const session = sessions.get(sessionId);
  const cwd = session?.cwd || "~";

  // Get just the directory name from the full path
  const dirName = cwd.split("/").filter(Boolean).pop() || cwd;

  const handleRefresh = () => {
    // Force refresh with current cwd
    refreshRoot(sessionId, cwd);
  };

  return (
    <div className="flex items-center justify-between px-3 h-9 border-b border-border-subtle bg-bg-sidebar">
      <div className="flex items-center gap-1.5 min-w-0">
        <IconFolderFilled className="w-3.5 h-3.5 text-accent-orange flex-shrink-0" />
        <span className="text-[13px] font-normal text-text-primary truncate" title={cwd}>
          {dirName}
        </span>
      </div>

      <button
        onClick={handleRefresh}
        className="p-1.5 hover:bg-bg-hover rounded text-text-muted hover:text-text-secondary transition-colors"
        title="Refresh"
      >
        <IconRefresh className="w-3.5 h-3.5" stroke={2} />
      </button>
    </div>
  );
}
