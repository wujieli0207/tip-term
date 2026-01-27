import { useGitStore } from "../../stores/gitStore";

interface DiffViewerProps {
  sessionId: string;
}

export default function DiffViewer({ sessionId: _sessionId }: DiffViewerProps) {
  const {
    selectedFilePath,
    selectedFileStaged,
    fileDiff,
    isDiffLoading,
  } = useGitStore();

  if (!selectedFilePath) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Staged/Unstaged badge */}
      <div className="px-3 py-1 border-b border-[#2a2a2a]">
        <span className="text-xs text-[#666] px-1.5 py-0.5 bg-[#2a2a2a] rounded">
          {selectedFileStaged ? "staged" : "unstaged"}
        </span>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {isDiffLoading ? (
          <div className="p-4 text-[#666]">Loading diff...</div>
        ) : fileDiff && fileDiff.hunks.length > 0 ? (
          <div className="p-2">
            {fileDiff.hunks.map((hunk, hunkIndex) => (
              <div key={hunkIndex} className="mb-4">
                {/* Hunk header */}
                <div className="text-[#888] bg-[#1a1a2e] px-2 py-1 rounded-t">
                  {hunk.header.trim()}
                </div>

                {/* Lines */}
                <div className="border border-[#2a2a2a] rounded-b overflow-hidden">
                  {hunk.lines.map((line, lineIndex) => {
                    const bgColor =
                      line.origin === "+"
                        ? "bg-green-900/30"
                        : line.origin === "-"
                        ? "bg-red-900/30"
                        : "bg-transparent";

                    const textColor =
                      line.origin === "+"
                        ? "text-green-400"
                        : line.origin === "-"
                        ? "text-red-400"
                        : "text-[#e0e0e0]";

                    return (
                      <div
                        key={lineIndex}
                        className={`flex ${bgColor}`}
                      >
                        {/* Line numbers */}
                        <div className="flex-shrink-0 w-8 text-right text-[#666] px-1 select-none border-r border-[#2a2a2a]">
                          {line.oldLineno || ""}
                        </div>
                        <div className="flex-shrink-0 w-8 text-right text-[#666] px-1 select-none border-r border-[#2a2a2a]">
                          {line.newLineno || ""}
                        </div>

                        {/* Origin */}
                        <div className={`flex-shrink-0 w-4 text-center ${textColor} select-none`}>
                          {line.origin !== " " ? line.origin : ""}
                        </div>

                        {/* Content */}
                        <pre className={`flex-1 px-2 ${textColor} whitespace-pre-wrap break-all`}>
                          {line.content}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-[#666]">
            {fileDiff?.hunks.length === 0 ? "No changes" : "Unable to load diff"}
          </div>
        )}
      </div>
    </div>
  );
}
