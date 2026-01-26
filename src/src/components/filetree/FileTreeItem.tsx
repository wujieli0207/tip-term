import { useFileTreeStore } from "../../stores/fileTreeStore";
import { FileEntry } from "../../types/file";
import { useEditorStore } from "../../stores/editorStore";

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

  const handleClick = () => {
    if (entry.is_directory) {
      toggleDirectory(sessionId, entry.path);
    } else {
      // Block clicks while a file is loading to prevent race conditions
      if (isAnyFileLoading) {
        return;
      }
      // Open file in editor
      useEditorStore.getState().openFile(entry.path).catch((error) => {
        console.error("Failed to open file:", error);
      });
    }
  };

  const getFileIcon = () => {
    if (entry.is_directory) {
      return isExpanded ? (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      );
    }

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

    return (
      <svg className={`w-4 h-4 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getFolderIcon = () => {
    if (isExpanded) {
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-[#2a2a2a] rounded text-sm select-none"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {entry.is_directory ? (
          <>
            <span className="flex-shrink-0 w-4">{getFileIcon()}</span>
            <span className="flex-shrink-0">{getFolderIcon()}</span>
          </>
        ) : (
          <>
            <span className="flex-shrink-0 w-4" />
            <span className="flex-shrink-0">{getFileIcon()}</span>
          </>
        )}
        <span
          className={`truncate ${entry.is_symlink ? "italic text-cyan-400" : "text-gray-300"}`}
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
            <FileTreeItem
              key={child.path}
              sessionId={sessionId}
              entry={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
