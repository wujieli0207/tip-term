import { useGitStore } from "../../stores/gitStore";
import { IconGitBranch, IconRefresh, IconX } from "@/components/ui/icons";

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
        <IconGitBranch className="w-4 h-4 text-purple-400" stroke={2} />
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
          <IconRefresh className="w-4 h-4" stroke={2} />
        </button>
        <button
          onClick={toggleGitPanel}
          className="p-1 rounded hover:bg-[#333] text-[#888] hover:text-[#e0e0e0] transition-colors"
          title="Close"
        >
          <IconX className="w-4 h-4" stroke={2} />
        </button>
      </div>
    </div>
  );
}
