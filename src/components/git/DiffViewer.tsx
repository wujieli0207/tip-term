import { useGitStore } from "../../stores/gitStore";
import PierreDiffViewer from "./PierreDiffViewer";

interface DiffViewerProps {
  sessionId: string;
}

export default function DiffViewer({ sessionId: _sessionId }: DiffViewerProps) {
  const {
    selectedFilePath,
    selectedFileStaged,
    selectedFileStatus,
    fileDiff,
    isDiffLoading,
  } = useGitStore();

  if (!selectedFilePath) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Staged/Unstaged badge */}
      <div className="px-3 py-1 border-b border-[#2a2a2a]">
        <span className="text-xs text-[#666] px-1.5 py-0.5 bg-[#2a2a2a] rounded">
          {selectedFileStaged ? "staged" : "unstaged"}
        </span>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {isDiffLoading ? (
          <div className="p-4 text-[#666]">Loading diff...</div>
        ) : fileDiff && fileDiff.hunks.length > 0 ? (
          <PierreDiffViewer
            fileDiff={fileDiff}
            showViewToggle={true}
            defaultViewMode="stacked"
            fileStatus={selectedFileStatus || undefined}
            className="h-full"
          />
        ) : (
          <div className="p-4 text-[#666]">
            {fileDiff?.hunks.length === 0 ? "No changes" : "Unable to load diff"}
          </div>
        )}
      </div>
    </div>
  );
}
