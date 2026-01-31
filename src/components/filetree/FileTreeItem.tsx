import { useFileTreeStore } from "../../stores/fileTreeStore";
import { FileEntry } from "../../types/file";
import { useEditorStore } from "../../stores/editorStore";
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
        <IconChevronDown className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" stroke={2} />
      ) : (
        <IconChevronRight className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" stroke={2} />
      );
    }
    return null;
  };

  const getFileIcon = () => {
    const fileName = entry.name.toLowerCase();
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
  const getTextColor = () => {
    if (entry.is_symlink) {
      return "italic text-[hsl(var(--accent-cyan))]";
    }
    if (isHighlighted) {
      return "text-[hsl(var(--text-primary))]";
    }
    if (entry.is_directory && isExpanded) {
      return "text-[hsl(var(--text-primary))]";
    }
    return "text-[hsl(var(--text-secondary))]";
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 h-7 cursor-pointer select-none rounded
          hover:bg-[hsl(var(--bg-hover))]
          ${isHighlighted ? "bg-[hsl(var(--bg-hover))]" : ""}`}
        style={{
          paddingLeft: `${depth * 18 + 6}px`,
          paddingRight: "6px",
        }}
        onClick={handleClick}
      >
        {entry.is_directory ? (
          <>
            <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
              {getChevronIcon()}
            </span>
            <span className="flex-shrink-0">{getFolderIcon()}</span>
          </>
        ) : (
          <>
            {/* 14px placeholder to align with chevron */}
            <span className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-shrink-0">{getFileIcon()}</span>
          </>
        )}
        <span
          className={`truncate text-[13px] font-normal ${getTextColor()}`}
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
