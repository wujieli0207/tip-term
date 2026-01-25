// Split pane node types - tree structure for nested splits
// Each node contains a ptyId (not sessionId) as each tab can have multiple PTYs
export type SplitPaneNode =
  | { type: "terminal"; id: string; ptyId: string }
  | {
      type: "split";
      id: string;
      direction: "horizontal" | "vertical";
      ratio: number;
      children: [SplitPaneNode, SplitPaneNode];
    };

export type SplitDirection = "horizontal" | "vertical";
export type FocusDirection = "up" | "down" | "left" | "right";

// Pane element registration for DOM positioning
export interface PaneElementInfo {
  paneId: string;
  ptyId: string;
  element: HTMLElement;
}

export interface SplitPaneStore {
  // State - per-session layouts
  layoutTrees: Map<string, SplitPaneNode | null>;
  focusedPanes: Map<string, string | null>;
  paneElements: Map<string, PaneElementInfo>;

  // Getters
  getLayoutForSession: (sessionId: string) => SplitPaneNode | null;
  getFocusedPaneForSession: (sessionId: string) => string | null;

  // Actions - all require sessionId
  initializeLayout: (sessionId: string, ptyId: string) => void;
  splitPane: (sessionId: string, paneId: string, direction: SplitDirection, newPtyId: string) => boolean;
  closePane: (sessionId: string, paneId: string) => { removedPtyId: string } | null;
  setFocusedPane: (sessionId: string, paneId: string) => void;
  updateSplitRatio: (sessionId: string, splitId: string, ratio: number) => void;
  moveFocus: (sessionId: string, direction: FocusDirection) => void;

  // Pane element registration
  registerPaneElement: (paneId: string, ptyId: string, element: HTMLElement) => void;
  unregisterPaneElement: (paneId: string) => void;
  getPaneElementForPty: (ptyId: string) => PaneElementInfo | null;

  // Helpers
  findPaneByPtyId: (sessionId: string, ptyId: string) => SplitPaneNode | null;
  getNestingLevel: (sessionId: string) => number;
  clearLayoutForSession: (sessionId: string) => void;
  removePtyFromLayout: (sessionId: string, ptyId: string) => void;
  getPtysInLayout: (sessionId: string) => string[];
}
