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
    <div className="flex items-center justify-between px-3 py-1 bg-[#0a0a0a] border-t border-[#2a2a2a] text-xs text-gray-500">
      <div className="flex items-center gap-4">
        <span>{getLanguageDisplay(activeFile.language)}</span>
      </div>
      <div className="flex items-center gap-4">
        {activeFile.isDirty ? (
          <span className="text-purple-400">Modified</span>
        ) : (
          <span className="text-green-500">Saved</span>
        )}
        <span className="text-gray-600" title={activeFile.path}>
          {activeFile.path.length > 50
            ? "..." + activeFile.path.slice(-47)
            : activeFile.path}
        </span>
      </div>
    </div>
  );
}
