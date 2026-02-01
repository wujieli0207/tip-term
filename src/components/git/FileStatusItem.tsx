import { useGitStore } from "../../stores/gitStore";
import { FileStatus } from "../../types/git";
import { IconExternalLink, IconMinus, IconPlus, IconX } from "@/components/ui/icons";

interface FileStatusItemProps {
  file: FileStatus;
  sessionId: string;
  staged: boolean;
  isUntracked?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  added: "text-accent-green",
  modified: "text-accent-orange",
  deleted: "text-accent-red",
  renamed: "text-accent-cyan",
  untracked: "text-accent-green",
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
    openFileInEditor,
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
    discardChanges(sessionId, file.path);
  };

  const handleJump = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFileInEditor(file.path, sessionId);
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
      className={`group flex items-center justify-between px-1 h-7 cursor-pointer hover:bg-bg-hover rounded ${
        isSelected ? "bg-bg-active" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center min-w-0 gap-2">
        <span
          className={`text-xs font-semibold w-4 text-center ${STATUS_COLORS[file.status]}`}
        >
          {STATUS_LETTERS[file.status]}
        </span>
        <div className="flex items-center min-w-0">
          <span className="text-[13px] text-text-primary truncate">{fileName}</span>
          {dirPath && (
            <span className="ml-1 text-xs truncate text-text-muted">
              {dirPath}
            </span>
          )}
        </div>
      </div>

      <div className="hidden group-hover:flex items-center gap-0.5">
        <button
          onClick={handleJump}
          className="p-0.5 rounded hover:bg-bg-active text-text-muted hover:text-accent-cyan"
          title="Open in editor"
        >
          <IconExternalLink className="w-3.5 h-3.5" stroke={2} />
        </button>

        {staged ? (
          <button
            onClick={handleUnstage}
            className="p-0.5 rounded hover:bg-bg-active text-text-muted hover:text-accent-red"
            title="Unstage"
          >
            <IconMinus className="w-3.5 h-3.5" stroke={2} />
          </button>
        ) : (
          <>
            <button
              onClick={handleStage}
              className="p-0.5 rounded hover:bg-bg-active text-text-muted hover:text-accent-green"
              title="Stage"
            >
              <IconPlus className="w-3.5 h-3.5" stroke={2} />
            </button>
            {!isUntracked && (
              <button
                onClick={handleDiscard}
                className="p-0.5 rounded hover:bg-bg-active text-text-muted hover:text-accent-red"
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
