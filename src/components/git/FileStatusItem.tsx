import { useGitStore } from "../../stores/gitStore";
import { FileStatus } from "../../types/git";
import { IconMinus, IconPlus, IconX } from "@/components/ui/icons";

interface FileStatusItemProps {
  file: FileStatus;
  sessionId: string;
  staged: boolean;
  isUntracked?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  added: "text-green-400",
  modified: "text-yellow-400",
  deleted: "text-red-400",
  renamed: "text-blue-400",
  untracked: "text-green-400",
};

const STATUS_LETTERS: Record<string, string> = {
  added: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
  untracked: "A",
};

export default function FileStatusItem({
  file,
  sessionId,
  staged,
  isUntracked = false,
}: FileStatusItemProps) {
  const {
    stageFile,
    unstageFile,
    discardChanges,
    selectFile,
    selectedFilePath,
  } = useGitStore();

  const handleStage = (e: React.MouseEvent) => {
    e.stopPropagation();
    stageFile(sessionId, file.path);
  };

  const handleUnstage = (e: React.MouseEvent) => {
    e.stopPropagation();
    unstageFile(sessionId, file.path);
  };

  const handleDiscard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Discard changes to ${file.path}?`)) {
      discardChanges(sessionId, file.path);
    }
  };

  const handleClick = () => {
    selectFile(file.path, staged, sessionId, file.status);
  };

  const isSelected = selectedFilePath === file.path;
  const fileName = file.path.split("/").pop() || file.path;
  const dirPath = file.path.includes("/")
    ? file.path.substring(0, file.path.lastIndexOf("/"))
    : "";

  return (
    <div
      className={`group flex items-center justify-between px-3 py-1 cursor-pointer hover:bg-[#1a1a1a] ${
        isSelected ? "bg-[#1a1a1a]" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-xs font-mono w-4 ${STATUS_COLORS[file.status]}`}
        >
          {STATUS_LETTERS[file.status]}
        </span>
        <div className="flex items-center min-w-0">
          <span className="text-sm text-[#e0e0e0] truncate">{fileName}</span>
          {dirPath && (
            <span className="text-xs text-[#666] ml-1 truncate">
              {dirPath}
            </span>
          )}
        </div>
      </div>

      <div className="hidden group-hover:flex items-center gap-1">
        {staged ? (
          <button
            onClick={handleUnstage}
            className="p-0.5 rounded hover:bg-[#333] text-[#888] hover:text-red-400"
            title="Unstage"
          >
            <IconMinus className="w-3.5 h-3.5" stroke={2} />
          </button>
        ) : (
          <>
            <button
              onClick={handleStage}
              className="p-0.5 rounded hover:bg-[#333] text-[#888] hover:text-green-400"
              title="Stage"
            >
              <IconPlus className="w-3.5 h-3.5" stroke={2} />
            </button>
            {!isUntracked && (
              <button
                onClick={handleDiscard}
                className="p-0.5 rounded hover:bg-[#333] text-[#888] hover:text-red-400"
                title="Discard changes"
              >
                <IconX className="w-3.5 h-3.5" stroke={2} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
