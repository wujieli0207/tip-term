import { useEffect } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { useFileTreeStore } from "../../stores/fileTreeStore";
import FileTreeHeader from "./FileTreeHeader";
import FileTreeView from "./FileTreeView";

export default function FileTreePanel() {
  const { activeSessionId, sessions } = useSessionStore();
  const { initSessionTree } = useFileTreeStore();

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;
  const cwd = activeSession?.cwd;

  // Initialize tree when session or cwd changes
  useEffect(() => {
    if (activeSessionId && cwd) {
      initSessionTree(activeSessionId, cwd);
    }
  }, [activeSessionId, cwd, initSessionTree]);

  // Don't show if no active terminal session or no cwd
  if (!activeSessionId || activeSession?.type !== "terminal" || !cwd) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-bg-terminal">
      <FileTreeHeader sessionId={activeSessionId} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <FileTreeView sessionId={activeSessionId} />
      </div>
    </div>
  );
}
