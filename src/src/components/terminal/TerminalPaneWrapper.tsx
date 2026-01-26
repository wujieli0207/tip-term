import { PaneId } from "../../types/splitPane";
import { useSplitPaneStore } from "../../stores/splitPaneStore";
import XTerminal from "../XTerminal";

interface TerminalPaneWrapperProps {
  rootSessionId: string;
  paneId: PaneId;
  sessionId: string;
}

export default function TerminalPaneWrapper({
  rootSessionId,
  paneId,
  sessionId,
}: TerminalPaneWrapperProps) {
  const focusedPaneId = useSplitPaneStore(
    (state) => state.layouts.get(rootSessionId)?.focusedPaneId
  );
  const setFocusedPane = useSplitPaneStore((state) => state.setFocusedPane);
  const isFocused = focusedPaneId === paneId;

  const handleClick = () => {
    if (!isFocused) {
      setFocusedPane(rootSessionId, paneId);
    }
  };

  return (
    <div
      className="flex-1 relative overflow-hidden min-h-0 min-w-0"
      onClick={handleClick}
    >
      <div className="absolute inset-0">
        <XTerminal sessionId={sessionId} isFocusedPane={isFocused} />
      </div>
      {/* Dark overlay for unfocused panes */}
      {!isFocused && (
        <div
          className="absolute inset-0 bg-black/40 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
