import { useFileTreeStore } from "../../stores/fileTreeStore";
import { FileEntry } from "../../types/file";
import { useEditorStore } from "../../stores/editorStore";
import {
  IconChevronDown,
  IconChevronRight,
  IconFile,
  IconFolderFilled,
  IconFolderOpen,
} from "@/components/ui/icons";

interface FileTreeItemProps {
  sessionId: string;
  entry: FileEntry;
  depth: number;
}

export default function FileTreeItem({ sessionId, entry, depth }: FileTreeItemProps) {
  const { sessionTrees, toggleDirectory } = useFileTreeStore();
  const loadingFilePath = useEditorStore((state) => state.loadingFilePath);
  const tree = sessionTrees.get(sessionId);

  const isExpanded = tree?.expandedPaths.has(entry.path) ?? false;
  const children = tree?.entries.get(entry.path);
  const isAnyFileLoading = loadingFilePath !== null;
  const highlightedPath = tree?.highlightedPath ?? null;
  const isHighlighted = entry.path === highlightedPath;

  const handleClick = () => {
    if (entry.is_directory) {
      toggleDirectory(sessionId, entry.path);
    } else {
      // Block clicks while a file is loading to prevent race conditions
      if (isAnyFileLoading) {
        return;
      }
      // Open file in editor
      useEditorStore
        .getState()
        .openFile(entry.path)
        .catch((error) => {
          console.error("Failed to open file:", error);
        });
    }
  };

  const getChevronIcon = () => {
    if (entry.is_directory) {
      return isExpanded ? (
        <IconChevronDown className="w-4 h-4 text-gray-400" stroke={2} />
      ) : (
        <IconChevronRight className="w-4 h-4 text-gray-400" stroke={2} />
      );
    }
    return null;
  };

  const getFileIcon = () => {
    // File icon - use different colors based on extension
    const ext = entry.name.split(".").pop()?.toLowerCase() || "";
    let iconColor = "text-gray-500";

    if (["ts", "tsx"].includes(ext)) iconColor = "text-blue-400";
    else if (["js", "jsx"].includes(ext)) iconColor = "text-yellow-400";
    else if (["rs"].includes(ext)) iconColor = "text-orange-400";
    else if (["json", "toml", "yaml", "yml"].includes(ext)) iconColor = "text-green-400";
    else if (["md", "txt"].includes(ext)) iconColor = "text-gray-400";
    else if (["css", "scss", "sass"].includes(ext)) iconColor = "text-pink-400";
    else if (["html"].includes(ext)) iconColor = "text-orange-300";

    return <IconFile className={`w-4 h-4 ${iconColor}`} stroke={2} />;
  };

  const getFolderIcon = () => {
    if (isExpanded) {
      return <IconFolderOpen className="w-4 h-4 text-yellow-500" stroke={2} />;
    }
    return <IconFolderFilled className="w-4 h-4 text-yellow-600" />;
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-[#2a2a2a] rounded text-sm select-none ${
          isHighlighted ? "bg-blue-500/20" : ""
        }`}
        style={{
          paddingLeft: `${depth * 12 + 8}px`,
          position: entry.is_directory ? "sticky" : undefined,
          top: 0,
          zIndex: entry.is_directory ? depth + 10 : "auto",
          backgroundColor: entry.is_directory ? "rgb(15, 15, 15)" : undefined,
        }}
        onClick={handleClick}
      >
        {entry.is_directory ? (
          <>
            <span className="flex-shrink-0 w-4">{getChevronIcon()}</span>
            <span className="flex-shrink-0">{getFolderIcon()}</span>
          </>
        ) : (
          <>
            <span className="flex-shrink-0 w-4" />
            <span className="flex-shrink-0">{getFileIcon()}</span>
          </>
        )}
        <span
          className={`truncate ${
            entry.is_symlink
              ? "italic text-cyan-400"
              : isHighlighted
                ? "text-blue-300"
                : "text-gray-300"
          }`}
          title={entry.path}
        >
          {entry.name}
          {entry.is_symlink && " →"}
        </span>
      </div>

      {/* Render children if expanded */}
      {entry.is_directory && isExpanded && children && (
        <div>
          {children.map((child) => (
            <FileTreeItem key={child.path} sessionId={sessionId} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
