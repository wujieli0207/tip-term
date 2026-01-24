import { useEffect } from "react";
import { useFileTreeStore } from "../../stores/fileTreeStore";
import FileTreeItem from "./FileTreeItem";

interface FileTreeViewProps {
  sessionId: string;
}

export default function FileTreeView({ sessionId }: FileTreeViewProps) {
  const { sessionTrees, loadDirectory } = useFileTreeStore();
  const tree = sessionTrees.get(sessionId);

  // Load root directory on mount
  useEffect(() => {
    if (tree && tree.rootPath && !tree.entries.has(tree.rootPath)) {
      loadDirectory(sessionId, tree.rootPath);
    }
  }, [sessionId, tree?.rootPath, loadDirectory]);

  if (!tree) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No directory available
      </div>
    );
  }

  if (tree.isLoading && tree.entries.size === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm flex items-center gap-2">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Loading...
      </div>
    );
  }

  if (tree.error) {
    return (
      <div className="p-4 text-red-400 text-sm">
        Error: {tree.error}
      </div>
    );
  }

  const rootEntries = tree.entries.get(tree.rootPath);

  if (!rootEntries || rootEntries.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Empty directory
      </div>
    );
  }

  return (
    <div className="py-1">
      {rootEntries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          sessionId={sessionId}
          entry={entry}
          depth={0}
        />
      ))}
    </div>
  );
}
