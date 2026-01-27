import { useGitStore } from "../../stores/gitStore";
import { FileStatus } from "../../types/git";
import FileStatusItem from "./FileStatusItem";

interface GitStatusSectionProps {
  title: "Staged" | "Changed" | "Untracked";
  files: FileStatus[];
  sessionId: string;
  staged: boolean;
  isUntracked?: boolean;
}

export default function GitStatusSection({
  title,
  files,
  sessionId,
  staged,
  isUntracked = false,
}: GitStatusSectionProps) {
  const {
    stagedExpanded,
    changedExpanded,
    untrackedExpanded,
    toggleStaged,
    toggleChanged,
    toggleUntracked,
    stageAll,
    unstageAll,
  } = useGitStore();

  if (files.length === 0) return null;

  const isExpanded =
    title === "Staged"
      ? stagedExpanded
      : title === "Changed"
      ? changedExpanded
      : untrackedExpanded;

  const toggle =
    title === "Staged"
      ? toggleStaged
      : title === "Changed"
      ? toggleChanged
      : toggleUntracked;

  const handleStageAll = () => {
    if (title === "Staged") {
      unstageAll(sessionId);
    } else {
      stageAll(sessionId);
    }
  };

  return (
    <div className="border-b border-[#2a2a2a]">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#1a1a1a]"
        onClick={toggle}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 text-[#666] transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 4l8 8-8 8z" />
          </svg>
          <span className="text-xs font-medium text-[#888] uppercase">
            {title}
          </span>
          <span className="text-xs text-[#666] bg-[#2a2a2a] px-1.5 py-0.5 rounded">
            {files.length}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleStageAll();
          }}
          className="text-xs text-[#666] hover:text-[#e0e0e0] transition-colors"
          title={title === "Staged" ? "Unstage all" : "Stage all"}
        >
          {title === "Staged" ? "Unstage all" : "Stage all"}
        </button>
      </div>

      {isExpanded && (
        <div className="pb-1">
          {files.map((file) => (
            <FileStatusItem
              key={file.path}
              file={file}
              sessionId={sessionId}
              staged={staged}
              isUntracked={isUntracked}
            />
          ))}
        </div>
      )}
    </div>
  );
}
