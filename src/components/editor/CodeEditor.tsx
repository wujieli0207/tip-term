import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { StreamLanguage } from "@codemirror/language";
import { go } from "@codemirror/legacy-modes/mode/go";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { sql } from "@codemirror/legacy-modes/mode/sql";
import { xml } from "@codemirror/legacy-modes/mode/xml";
import { css } from "@codemirror/legacy-modes/mode/css";
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeEditorProps {
  content: string;
  language: string;
  onChange: (value: string) => void;
}

// Get language extension based on detected language
function getLanguageExtension(language: string): Extension[] {
  switch (language) {
    case "javascript":
      return [javascript({ jsx: true })];
    case "typescript":
      return [javascript({ jsx: true, typescript: true })];
    case "python":
      return [python()];
    case "rust":
      return [rust()];
    case "go":
      return [StreamLanguage.define(go)];
    case "shell":
      return [StreamLanguage.define(shell)];
    case "yaml":
      return [StreamLanguage.define(yaml)];
    case "toml":
      return [StreamLanguage.define(toml)];
    case "sql":
      return [StreamLanguage.define(sql({}))];
    case "xml":
    case "html":
      return [StreamLanguage.define(xml)];
    case "css":
      return [StreamLanguage.define(css)];
    case "json":
      return [json()];
    case "markdown":
      return [markdown()];
    default:
      return [];
  }
}

// Custom theme overrides to match terminal aesthetics
const customTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0f0f0f",
    },
    ".cm-content": {
      caretColor: "#a855f7",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#a855f7",
    },
    ".cm-activeLine": {
      backgroundColor: "#1a1a1a",
    },
    ".cm-gutters": {
      backgroundColor: "#0a0a0a",
      color: "#4a4a4a",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#1a1a1a",
    },
    ".cm-panels": {
      backgroundColor: "#1a1a1a",
      color: "#e0e0e0",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid #2a2a2a",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "1px solid #2a2a2a",
    },
  },
  { dark: true }
);

export default function CodeEditor({ content, language, onChange }: CodeEditorProps) {
  const extensions = useMemo(
    () => [
      oneDark,
      customTheme,
      EditorView.lineWrapping,
      ...getLanguageExtension(language),
    ],
    [language]
  );

  return (
    <CodeMirror
      value={content}
      height="100%"
      theme="none"
      extensions={extensions}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        history: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: false,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
      className="h-full"
    />
  );
}
