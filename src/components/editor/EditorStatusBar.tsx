import { useEditorStore } from "../../stores/editorStore";

export default function EditorStatusBar() {
  const { getActiveFile } = useEditorStore();
  const activeFile = getActiveFile();

  if (!activeFile) {
    return null;
  }

  // Get display name for language
  const getLanguageDisplay = (lang: string): string => {
    const displayNames: Record<string, string> = {
      javascript: "JavaScript",
      typescript: "TypeScript",
      python: "Python",
      rust: "Rust",
      go: "Go",
      json: "JSON",
      yaml: "YAML",
      toml: "TOML",
      html: "HTML",
      css: "CSS",
      shell: "Shell",
      markdown: "Markdown",
      xml: "XML",
      sql: "SQL",
      text: "Plain Text",
    };
    return displayNames[lang] || lang;
  };

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-bg-terminal border-t border-border-subtle text-xs text-text-muted">
      <div className="flex items-center gap-4">
        <span>{getLanguageDisplay(activeFile.language)}</span>
      </div>
      <div className="flex items-center gap-4">
        {activeFile.isDirty ? (
          <span className="text-accent-primary">Modified</span>
        ) : (
          <span className="text-accent-green">Saved</span>
        )}
        <span className="text-text-muted" title={activeFile.path}>
          {activeFile.path.length > 50
            ? "..." + activeFile.path.slice(-47)
            : activeFile.path}
        </span>
      </div>
    </div>
  );
}
