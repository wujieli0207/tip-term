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
      <div className="flex items-center justify-between px-2 py-1">
        <BranchSwitcher sessionId={sessionId} />

        <button
          onClick={handleRefresh}
          className="p-1 rounded hover:bg-bg-active text-text-muted hover:text-text-primary transition-colors"
          title="Refresh"
        >
          <IconRefresh className="w-4 h-4" stroke={2} />
        </button>
      </div>

      {/* Create Branch Modal */}
      <CreateBranchModal sessionId={sessionId} />
    </>
  );
}
