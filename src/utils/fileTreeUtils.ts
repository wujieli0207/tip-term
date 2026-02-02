import { FileEntry, FileTreeNode } from "../types/file";

/**
 * Convert a flat Map<path, FileEntry[]> structure to a nested FileTreeNode[] tree
 */
export function buildFileTree(
  entries: Map<string, FileEntry[]>,
  expandedPaths: Set<string>,
  rootPath: string
): FileTreeNode[] {
  const rootEntries = entries.get(rootPath);
  if (!rootEntries) {
    return [];
  }

  return rootEntries.map((entry) => convertEntryToNode(entry, entries, expandedPaths));
}

/**
 * Convert a single FileEntry to a FileTreeNode, recursively building children
 */
function convertEntryToNode(
  entry: FileEntry,
  entries: Map<string, FileEntry[]>,
  expandedPaths: Set<string>
): FileTreeNode {
  const node: FileTreeNode = {
    id: entry.path,
    name: entry.name,
    path: entry.path,
    is_directory: entry.is_directory,
    is_symlink: entry.is_symlink,
    is_hidden: entry.is_hidden,
  };

  if (entry.is_directory) {
    const isExpanded = expandedPaths.has(entry.path);
    const childEntries = entries.get(entry.path);

    if (isExpanded) {
      if (childEntries === undefined) {
        // Directory is expanded but not yet loaded - show loading placeholder
        node.children = [
          {
            id: `${entry.path}/__loading__`,
            name: "Loading...",
            path: `${entry.path}/__loading__`,
            is_directory: false,
            is_symlink: false,
            is_hidden: false,
            isLoading: true,
          },
        ];
      } else if (childEntries.length === 0) {
        // Empty directory
        node.children = [];
      } else {
        // Has children - recursively convert them
        node.children = childEntries.map((child) =>
          convertEntryToNode(child, entries, expandedPaths)
        );
      }
    } else {
      // Directory is collapsed - use empty array to indicate it's a folder
      // react-arborist will show the folder icon and allow expanding
      node.children = [];
    }
  }
  // For files, children remains undefined

  return node;
}
