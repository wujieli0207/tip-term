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
