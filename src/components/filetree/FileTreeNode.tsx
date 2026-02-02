import { NodeRendererProps } from "react-arborist";
import { FileTreeNode as FileTreeNodeType } from "../../types/file";
import { useEditorStore } from "../../stores/editorStore";
import { useFileTreeStore } from "../../stores/fileTreeStore";
import { useSessionStore } from "../../stores/sessionStore";
import { FileTreeContextMenu } from "./FileTreeContextMenu";
import {
  IconChevronDown,
  IconChevronRight,
  IconFile,
  IconFileText,
  IconFileSettings,
  IconFolder,
  IconFileTypeTs,
  IconFileTypeTsx,
  IconFileTypeJs,
  IconFileTypeJsx,
  IconFileTypeRs,
  IconFileTypeVue,
  IconFileTypeCss,
  IconFileTypeHtml,
  IconFileTypeSql,
  IconFileTypePdf,
  IconFileTypePng,
  IconFileTypeJpg,
  IconFileTypeBmp,
  IconFileTypeSvg,
  IconFileTypeTxt,
  IconFileTypeCsv,
  IconFileTypeXml,
  IconFileTypeZip,
  IconBrandPython,
  IconBrandGolang,
  IconBrandSass,
  IconBrandDocker,
  IconLoader2,
} from "@/components/ui/icons";
import type { Icon } from "@tabler/icons-react";

// Icon configuration type
type IconConfig = {
  Icon: Icon;
  colorClass: string;
};

// File icon mapping configuration
const FILE_ICON_CONFIG: Record<string, IconConfig> = {
  // TypeScript/JavaScript
  ts: { Icon: IconFileTypeTs, colorClass: "text-blue-500" },
  tsx: { Icon: IconFileTypeTsx, colorClass: "text-blue-500" },
  js: { Icon: IconFileTypeJs, colorClass: "text-yellow-500" },
  jsx: { Icon: IconFileTypeJsx, colorClass: "text-yellow-500" },
  // Other languages
  rs: { Icon: IconFileTypeRs, colorClass: "text-orange-500" },
  vue: { Icon: IconFileTypeVue, colorClass: "text-green-500" },
  py: { Icon: IconBrandPython, colorClass: "text-blue-400" },
  go: { Icon: IconBrandGolang, colorClass: "text-cyan-500" },
  // Styles
  css: { Icon: IconFileTypeCss, colorClass: "text-blue-400" },
  scss: { Icon: IconBrandSass, colorClass: "text-pink-400" },
  sass: { Icon: IconBrandSass, colorClass: "text-pink-400" },
  // Markup
  html: { Icon: IconFileTypeHtml, colorClass: "text-orange-500" },
  xml: { Icon: IconFileTypeXml, colorClass: "text-orange-300" },
  svg: { Icon: IconFileTypeSvg, colorClass: "text-orange-400" },
  // Data formats
  json: { Icon: IconFileText, colorClass: "text-[hsl(var(--accent-cyan))]" },
  yaml: { Icon: IconFileSettings, colorClass: "text-[hsl(var(--accent-cyan))]" },
  yml: { Icon: IconFileSettings, colorClass: "text-[hsl(var(--accent-cyan))]" },
  toml: { Icon: IconFileSettings, colorClass: "text-[hsl(var(--accent-cyan))]" },
  csv: { Icon: IconFileTypeCsv, colorClass: "text-green-400" },
  sql: { Icon: IconFileTypeSql, colorClass: "text-blue-300" },
  // Documents
  md: { Icon: IconFileText, colorClass: "text-gray-400" },
  txt: { Icon: IconFileTypeTxt, colorClass: "text-gray-400" },
  pdf: { Icon: IconFileTypePdf, colorClass: "text-red-500" },
  // Images
  png: { Icon: IconFileTypePng, colorClass: "text-purple-400" },
  jpg: { Icon: IconFileTypeJpg, colorClass: "text-purple-400" },
  jpeg: { Icon: IconFileTypeJpg, colorClass: "text-purple-400" },
  bmp: { Icon: IconFileTypeBmp, colorClass: "text-purple-400" },
  // Archives
  zip: { Icon: IconFileTypeZip, colorClass: "text-yellow-600" },
};

// Special filename mappings (exact match)
const FILENAME_ICON_CONFIG: Record<string, IconConfig> = {
  dockerfile: { Icon: IconBrandDocker, colorClass: "text-blue-400" },
};

const getChevronIcon = (isOpen: boolean) => {
  return isOpen ? (
    <IconChevronDown className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" stroke={2} />
  ) : (
    <IconChevronRight className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" stroke={2} />
  );
};

const getFileIcon = (name: string) => {
  const fileName = name.toLowerCase();
  const ext = fileName.split(".").pop() || "";

  // Check for special filename matches first (e.g., Dockerfile)
  const filenameConfig = FILENAME_ICON_CONFIG[fileName];
  if (filenameConfig) {
    const { Icon, colorClass } = filenameConfig;
    return <Icon className={`w-3.5 h-3.5 ${colorClass}`} stroke={2} />;
  }

  // Check for extension-based icon
  const extConfig = FILE_ICON_CONFIG[ext];
  if (extConfig) {
    const { Icon, colorClass } = extConfig;
    return <Icon className={`w-3.5 h-3.5 ${colorClass}`} stroke={2} />;
  }

  // Default icon for unknown file types
  return <IconFile className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" stroke={2} />;
};

const getFolderIcon = () => {
  return <IconFolder className="w-3.5 h-3.5 text-[hsl(var(--accent-orange))]" stroke={2} />;
};

// Calculate text color based on state
const getTextColor = (
  isSymlink: boolean,
  isSelected: boolean,
  isDirectory: boolean,
  isOpen: boolean
) => {
  if (isSymlink) {
    return "italic text-[hsl(var(--accent-cyan))]";
  }
  if (isSelected) {
    return "text-[hsl(var(--text-primary))]";
  }
  if (isDirectory && isOpen) {
    return "text-[hsl(var(--text-primary))]";
  }
  return "text-[hsl(var(--text-secondary))]";
};

export default function FileTreeNode({ node, style }: NodeRendererProps<FileTreeNodeType>) {
  const loadingFilePath = useEditorStore((state) => state.loadingFilePath);
  const isAnyFileLoading = loadingFilePath !== null;
  const data = node.data;

  // Get rootPath for context menu
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessionTrees = useFileTreeStore((state) => state.sessionTrees);
  const rootPath = activeSessionId ? sessionTrees.get(activeSessionId)?.rootPath ?? "" : "";

  // Handle loading placeholder nodes
  if (data.isLoading) {
    return (
      <div
        style={style}
        className="flex items-center gap-1.5 h-7 cursor-default select-none rounded text-[hsl(var(--text-muted))]"
      >
        <span className="flex-shrink-0 w-3.5 h-3.5" />
        <IconLoader2 className="w-3.5 h-3.5 animate-spin" stroke={2} />
        <span className="text-[13px]">Loading...</span>
      </div>
    );
  }

  const handleClick = () => {
    if (data.is_directory) {
      node.toggle();
    } else {
      // Block clicks while a file is loading to prevent race conditions
      if (isAnyFileLoading) {
        return;
      }
      // Open file in editor
      useEditorStore
        .getState()
        .openFile(data.path)
        .catch((error) => {
          console.error("Failed to open file:", error);
        });
    }
  };

  return (
    <FileTreeContextMenu filePath={data.path} rootPath={rootPath}>
      <div
        style={style}
        className={`flex items-center gap-1.5 h-7 cursor-pointer select-none rounded
          hover:bg-[hsl(var(--bg-hover))]
          ${node.isSelected ? "bg-[hsl(var(--bg-hover))]" : ""}`}
        onClick={handleClick}
      >
        {data.is_directory ? (
          <>
            <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
              {getChevronIcon(node.isOpen)}
            </span>
            <span className="flex-shrink-0">{getFolderIcon()}</span>
          </>
        ) : (
          <>
            {/* 14px placeholder to align with chevron */}
            <span className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-shrink-0">{getFileIcon(data.name)}</span>
          </>
        )}
        <span
          className={`truncate text-[13px] font-normal ${getTextColor(
            data.is_symlink,
            node.isSelected,
            data.is_directory,
            node.isOpen
          )}`}
          title={data.path}
        >
          {data.name}
          {data.is_symlink && " →"}
        </span>
      </div>
    </FileTreeContextMenu>
  );
}
