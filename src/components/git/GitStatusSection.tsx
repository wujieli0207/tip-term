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
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-bg-hover rounded"
        onClick={toggle}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 text-text-muted transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 4l8 8-8 8z" />
          </svg>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-[1px]">
            {title}
          </span>
          <span className="text-[11px] text-text-muted bg-bg-active px-1.5 py-0.5 rounded min-w-[18px] text-center">
            {files.length}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleStageAll();
          }}
          className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
          title={title === "Staged" ? "Unstage all" : "Stage all"}
        >
          {title === "Staged" ? "Unstage all" : "Stage all"}
        </button>
      </div>

      {isExpanded && (
        <div>
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
