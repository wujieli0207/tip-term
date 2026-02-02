export interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  is_hidden: boolean;
}

export type SearchFileEntry = FileEntry & {
  match_type: "prefix" | "contains";
};

// FileTreeNode for react-arborist
export interface FileTreeNode {
  id: string; // Use file path as unique ID
  name: string;
  children?: FileTreeNode[] | null; // null = not loaded, [] = empty dir, undefined = file
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  is_hidden: boolean;
  isLoading?: boolean; // Loading indicator
}
