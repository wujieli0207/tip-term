import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Tree, TreeApi } from "react-arborist";
import { useFileTreeStore } from "../../stores/fileTreeStore";
import { FileTreeNode as FileTreeNodeType } from "../../types/file";
import FileTreeNode from "./FileTreeNode";

interface FileTreeViewProps {
  sessionId: string;
}

export default function FileTreeView({ sessionId }: FileTreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<TreeApi<FileTreeNodeType>>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  const prevExpandedPathsRef = useRef<Set<string>>(new Set());

  const { sessionTrees, loadDirectory, setExpandedPath, getTreeData } = useFileTreeStore();
  const tree = sessionTrees.get(sessionId);

  // Get tree data from store
  const treeData = useMemo(() => {
    return getTreeData(sessionId);
  }, [sessionId, getTreeData, tree?.entries, tree?.expandedPaths]);

  // Get highlighted path for selection
  const highlightedPath = tree?.highlightedPath ?? null;

  // Convert expandedPaths Set to OpenMap for react-arborist
  const initialOpenState = useMemo(() => {
    if (!tree) return {};
    const map: Record<string, boolean> = {};
    tree.expandedPaths.forEach((path) => {
      map[path] = true;
    });
    return map;
  }, []); // Only compute once on mount

  // Load root directory on mount
  useEffect(() => {
    if (tree && tree.rootPath && !tree.entries.has(tree.rootPath)) {
      loadDirectory(sessionId, tree.rootPath);
    }
  }, [sessionId, tree?.rootPath, loadDirectory]);

  // Handle container resize for virtual scrolling
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Sync react-arborist open state with store's expandedPaths
  useEffect(() => {
    if (!treeRef.current || !tree) return;

    const currentExpandedPaths = tree.expandedPaths;
    const prevExpandedPaths = prevExpandedPathsRef.current;

    // Find paths that were added (need to open)
    currentExpandedPaths.forEach((path) => {
      if (!prevExpandedPaths.has(path)) {
        const node = treeRef.current?.get(path);
        if (node && !node.isOpen) {
          treeRef.current?.open(path);
        }
      }
    });

    // Find paths that were removed (need to close)
    prevExpandedPaths.forEach((path) => {
      if (!currentExpandedPaths.has(path)) {
        const node = treeRef.current?.get(path);
        if (node && node.isOpen) {
          treeRef.current?.close(path);
        }
      }
    });

    prevExpandedPathsRef.current = new Set(currentExpandedPaths);
  }, [tree?.expandedPaths]);

  // Scroll to and select highlighted file when it changes
  useEffect(() => {
    if (highlightedPath && treeRef.current) {
      const node = treeRef.current.get(highlightedPath);
      if (node) {
        // Scroll to the node and select it
        treeRef.current.scrollTo(highlightedPath);
        treeRef.current.select(highlightedPath);
      }
    }
  }, [highlightedPath, treeData]);

  // Handle toggle (open/close folders)
  const handleToggle = useCallback(
    (nodeId: string) => {
      if (!tree) return;
      const isExpanded = tree.expandedPaths.has(nodeId);
      setExpandedPath(sessionId, nodeId, !isExpanded);
    },
    [sessionId, tree, setExpandedPath]
  );

  if (!tree) {
    return (
      <div className="p-4 text-gray-500 text-sm">No directory available</div>
    );
  }

  if (tree.isLoading && tree.entries.size === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm flex items-center gap-2">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading...
      </div>
    );
  }

  if (tree.error) {
    return <div className="p-4 text-red-400 text-sm">Error: {tree.error}</div>;
  }

  const rootEntries = tree.entries.get(tree.rootPath);

  if (!rootEntries || rootEntries.length === 0) {
    return <div className="p-4 text-gray-500 text-sm">Empty directory</div>;
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden p-2">
      <Tree<FileTreeNodeType>
        ref={treeRef}
        data={treeData}
        width="100%"
        height={containerHeight}
        indent={18}
        rowHeight={28}
        openByDefault={false}
        initialOpenState={initialOpenState}
        selection={highlightedPath ?? undefined}
        disableMultiSelection
        disableDrag
        disableDrop
        onToggle={handleToggle}
      >
        {FileTreeNode}
      </Tree>
    </div>
  );
}
