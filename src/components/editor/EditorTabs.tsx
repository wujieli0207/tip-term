import { useEditorStore, EditorFile } from "../../stores/editorStore";
import { IconX } from "@/components/ui/icons";

export default function EditorTabs() {
  const { openFiles, activeFilePath, setActiveFile, closeFile } = useEditorStore();

  const files = Array.from(openFiles.values());

  if (files.length === 0) {
    return null;
  }

  const handleClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const file = openFiles.get(path);

    // If file has unsaved changes, confirm before closing
    if (file?.isDirty) {
      if (!confirm(`"${file.filename}" has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    closeFile(path);
  };

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
      {files.map((file: EditorFile) => (
        <button
          key={file.path}
          onClick={() => setActiveFile(file.path)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
            file.path === activeFilePath
              ? "bg-bg-active text-text-primary"
              : "bg-transparent text-text-secondary hover:bg-bg-active hover:text-text-primary"
          }`}
          title={file.path}
        >
          <span className="truncate max-w-[150px]">{file.filename}</span>
          {file.isDirty && (
            <span className="w-2 h-2 bg-accent-primary rounded-full flex-shrink-0" title="Unsaved changes" />
          )}
          <span
            onClick={(e) => handleClose(e, file.path)}
            className="ml-1 p-0.5 rounded hover:bg-bg-active text-text-muted hover:text-text-primary"
          >
            <IconX className="w-3 h-3" stroke={2} />
          </span>
        </button>
      ))}
    </div>
  );
}
