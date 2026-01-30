import { useGitStore } from "../../stores/gitStore";
import { IconRefresh } from "@/components/ui/icons";
import BranchSwitcher from "./BranchSwitcher";
import CreateBranchModal from "./CreateBranchModal";

interface GitPanelHeaderProps {
  sessionId: string;
}

export default function GitPanelHeader({ sessionId }: GitPanelHeaderProps) {
  const {
    sessionGitState,
    loadGitStatus,
  } = useGitStore();

  const gitState = sessionGitState.get(sessionId);

  const handleRefresh = () => {
    if (gitState?.repoPath) {
      loadGitStatus(sessionId, gitState.repoPath);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <BranchSwitcher sessionId={sessionId} />

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-[#333] text-[#888] hover:text-[#e0e0e0] transition-colors"
            title="Refresh"
          >
            <IconRefresh className="w-4 h-4" stroke={2} />
          </button>
        </div>
      </div>

      {/* Create Branch Modal */}
      <CreateBranchModal sessionId={sessionId} />
    </>
  );
}
