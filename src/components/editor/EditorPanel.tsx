import { useEditorStore } from "../../stores/editorStore";
import { useResizable } from "../../hooks/useResizable";
import EditorHeader from "./EditorHeader";
import EditorStatusBar from "./EditorStatusBar";
import CodeEditor from "./CodeEditor";

export default function EditorPanel() {
  const { editorWidth, setEditorWidth, getActiveFile, updateFileContent } = useEditorStore();
  const loadingFilePath = useEditorStore((state) => state.loadingFilePath);
  const activeFile = getActiveFile();
  const isLoading = loadingFilePath !== null;

  // Resize handling - resize from right edge for left-side panel
  const { panelRef, isResizing, handleMouseDown } = useResizable({
    onResize: setEditorWidth,
    direction: "right",
  });

  const handleChange = (value: string) => {
    if (activeFile) {
      updateFileContent(activeFile.path, value);
    }
  };

  return (
    <div
      ref={panelRef}
      className="relative flex flex-col bg-bg-terminal border-r border-border-subtle"
      style={{ width: editorWidth, minWidth: 300, maxWidth: 800 }}
    >
      <EditorHeader />

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <svg
                className="w-8 h-8 mx-auto mb-2 text-accent-primary animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm">Loading file...</p>
            </div>
          </div>
        ) : activeFile ? (
          <CodeEditor
            content={activeFile.content}
            language={activeFile.language}
            onChange={handleChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">No file open</p>
              <p className="text-xs text-text-muted mt-1">Click a file in the tree to edit</p>
            </div>
          </div>
        )}
      </div>

      <EditorStatusBar />

      {/* Resize handle */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent-primary transition-colors ${
          isResizing ? "bg-accent-primary" : "bg-transparent"
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
