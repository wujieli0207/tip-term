import { useEffect, useRef } from "react";
import { Folder } from "lucide-react";
import { SearchFileEntry } from "../../types/file";
import { HighlightMatch } from "./HighlightMatch";
import { getIconColor } from "./utils/iconColors";

interface ResultItemProps {
  file: SearchFileEntry;
  isSelected: boolean;
  query: string;
  onClick: () => void;
  onMouseEnter: () => void;
}

export function ResultItem({
  file,
  isSelected,
  query,
  onClick,
  onMouseEnter,
}: ResultItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  // Get the directory path (everything before the filename)
  const pathParts = file.path.split("/");
  const dirPath = pathParts.slice(0, -1).join("/");

  // Get consistent icon color based on path
  const iconColorClass = getIconColor(file.path);

  return (
    <div
      ref={itemRef}
      className={`
        h-[52px] rounded-lg px-3 cursor-pointer flex items-center gap-3
        ${isSelected ? "bg-accent-primary" : ""}
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {/* Icon Container */}
      <div
        className={`
          w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
          ${isSelected ? "bg-white/20" : "bg-hover"}
        `}
      >
        <Folder
          className={`w-[18px] h-[18px] ${isSelected ? "text-white" : iconColorClass}`}
        />
      </div>

      {/* Text Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className={`text-[14px] font-sans font-medium truncate ${isSelected ? "text-white" : "text-primary"}`}>
          <HighlightMatch text={file.name} query={query} />
        </div>
        <div className={`text-xs font-mono truncate ${isSelected ? "text-white/60" : "text-text-secondary"}`}>
          {dirPath}
        </div>
      </div>

      {/* Enter Symbol */}
      {isSelected && (
        <div className="text-white/50 text-sm flex-shrink-0">↵</div>
      )}
    </div>
  );
}
