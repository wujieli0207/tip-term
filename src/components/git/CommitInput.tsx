import { useState, useRef, useEffect } from "react";
import { useGitStore } from "../../stores/gitStore";

const COMMIT_PREFIXES = [
  { prefix: "feat:", description: "A new feature" },
  { prefix: "fix:", description: "A bug fix" },
  { prefix: "docs:", description: "Documentation changes" },
  { prefix: "style:", description: "Code style changes" },
  { prefix: "refactor:", description: "Code refactoring" },
  { prefix: "perf:", description: "Performance improvement" },
  { prefix: "test:", description: "Adding tests" },
  { prefix: "chore:", description: "Maintenance tasks" },
];

export default function CommitInput() {
  const { commitMessage, setCommitMessage } = useGitStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommitMessage(value);

    // Show suggestions when starting to type and no prefix yet
    if (value.length > 0 && value.length < 10 && !value.includes(":")) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectPrefix = (prefix: string) => {
    setCommitMessage(prefix + " ");
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        100
      )}px`;
    }
  }, [commitMessage]);

  const filteredPrefixes = commitMessage
    ? COMMIT_PREFIXES.filter((p) =>
        p.prefix.toLowerCase().startsWith(commitMessage.toLowerCase())
      )
    : COMMIT_PREFIXES;

  return (
    <div className="relative px-3 py-2">
      <textarea
        ref={textareaRef}
        value={commitMessage}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (commitMessage.length > 0 && commitMessage.length < 10 && !commitMessage.includes(":")) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="Commit message..."
        className="w-full bg-[#1a1a1a] text-[#e0e0e0] text-sm px-3 py-2 rounded border border-[#2a2a2a] focus:border-purple-500 focus:outline-none resize-none placeholder-[#666]"
        rows={1}
      />

      {showSuggestions && filteredPrefixes.length > 0 && (
        <div className="absolute left-3 right-3 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded shadow-lg z-10 max-h-48 overflow-y-auto">
          {filteredPrefixes.map((item) => (
            <button
              key={item.prefix}
              onClick={() => handleSelectPrefix(item.prefix)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="text-sm font-mono text-purple-400">
                {item.prefix}
              </span>
              <span className="text-xs text-[#666]">{item.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
