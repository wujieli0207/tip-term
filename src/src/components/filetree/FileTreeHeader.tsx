import { useFileTreeStore } from "../../stores/fileTreeStore";
import { useSessionStore } from "../../stores/sessionStore";

interface FileTreeHeaderProps {
  sessionId: string;
}

export default function FileTreeHeader({ sessionId }: FileTreeHeaderProps) {
  const { refreshRoot, toggleFileTreeVisible } = useFileTreeStore();
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
        <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={toggleFileTreeVisible}
          className="p-1 hover:bg-[#2a2a2a] rounded text-gray-400 hover:text-gray-200 transition-colors"
          title="Close (Cmd+B)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
