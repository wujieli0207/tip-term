import { useEffect, useRef } from "react";
import { SearchFileEntry } from "../../types/file";
import { getFileIcon } from "./utils/fileIcons";
import { HighlightMatch } from "./HighlightMatch";

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

  return (
    <div
      ref={itemRef}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
        isSelected ? "bg-[#2a2a2a]" : "hover:bg-[#222]"
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <span className="text-base flex-shrink-0">{getFileIcon(file.name)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">
          <HighlightMatch text={file.name} query={query} />
        </div>
        <div className="text-xs text-gray-500 truncate">{dirPath}</div>
      </div>
    </div>
  );
}
