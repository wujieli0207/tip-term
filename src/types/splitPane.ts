export type PaneId = string;
export type SplitDirection = "horizontal" | "vertical";
export type NavigationDirection = "up" | "down" | "left" | "right";

export interface TerminalPane {
  type: "terminal";
  id: PaneId;
  sessionId: string; // PTY session ID
}

export interface SplitNode {
  type: "split";
  id: PaneId;
  direction: SplitDirection;
  children: [PaneNode, PaneNode];
  sizes: [number, number]; // percentages
}

export type PaneNode = TerminalPane | SplitNode;

export interface TabLayout {
  root: PaneNode;
  focusedPaneId: PaneId;
}
