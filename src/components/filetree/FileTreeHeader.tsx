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
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
      <div className="flex items-center gap-2 min-w-0">
        <IconFolderFilled className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        <span className="text-sm text-gray-200 truncate" title={cwd}>
          {dirName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleRefresh}
          className="p-1 hover:bg-[#2a2a2a] rounded text-gray-400 hover:text-gray-200 transition-colors"
          title="Refresh"
        >
          <IconRefresh className="w-4 h-4" stroke={2} />
        </button>
      </div>
    </div>
  );
}
