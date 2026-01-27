import { useGitStore } from "../../stores/gitStore";

interface GitPanelHeaderProps {
  sessionId: string;
}

export default function GitPanelHeader({ sessionId }: GitPanelHeaderProps) {
  const {
    sessionGitState,
    toggleGitPanel,
    loadGitStatus,
  } = useGitStore();

  const gitState = sessionGitState.get(sessionId);
  const status = gitState?.status;

  const handleRefresh = () => {
    if (gitState?.repoPath) {
      loadGitStatus(sessionId, gitState.repoPath);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-purple-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="3" x2="12" y2="9" />
          <line x1="12" y1="15" x2="12" y2="21" />
          <path d="M5.5 8L12 12l6.5 -4" />
        </svg>
        <span className="text-sm font-medium text-[#e0e0e0]">
          {status?.isDetached ? (
            <span className="text-orange-400">{status.branchName}</span>
          ) : (
            status?.branchName || "Git"
          )}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleRefresh}
          className="p-1 rounded hover:bg-[#333] text-[#888] hover:text-[#e0e0e0] transition-colors"
          title="Refresh"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
        <button
          onClick={toggleGitPanel}
          className="p-1 rounded hover:bg-[#333] text-[#888] hover:text-[#e0e0e0] transition-colors"
          title="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
