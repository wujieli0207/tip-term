import { useCallback, useRef, useEffect } from "react";
import { useSplitPaneStore } from "../../stores/splitPaneStore";

interface TerminalPaneProps {
  paneId: string;
  ptyId: string;
  sessionId: string;
}

// This component now just provides a placeholder/container for the terminal
// The actual XTerminal is rendered in TerminalContainer and positioned to match this element
export default function TerminalPane({ paneId, ptyId, sessionId }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedPaneId = useSplitPaneStore((state) => state.focusedPanes.get(sessionId) ?? null);
  const setFocusedPane = useSplitPaneStore((state) => state.setFocusedPane);
  const registerPaneElement = useSplitPaneStore((state) => state.registerPaneElement);
  const unregisterPaneElement = useSplitPaneStore((state) => state.unregisterPaneElement);
  const isFocused = focusedPaneId === paneId;

  // Register this pane's DOM element for positioning
  useEffect(() => {
    if (containerRef.current) {
      registerPaneElement(paneId, ptyId, containerRef.current);
    }
    return () => {
      unregisterPaneElement(paneId);
    };
  }, [paneId, ptyId, registerPaneElement, unregisterPaneElement]);

  const handleFocus = useCallback(() => {
    setFocusedPane(sessionId, paneId);
  }, [sessionId, paneId, setFocusedPane]);

  return (
    <div
      ref={containerRef}
      data-pane-id={paneId}
      data-pty-id={ptyId}
      className="h-full w-full relative"
      onMouseDown={handleFocus}
    >
      {/* Overlay for unfocused panes */}
      {!isFocused && (
        <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
      )}
    </div>
  );
}
