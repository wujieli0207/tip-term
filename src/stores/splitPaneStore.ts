import { create } from "zustand";
import {
  PaneId,
  PaneNode,
  SplitDirection,
  SplitNode,
  TabLayout,
  TerminalPane,
  NavigationDirection,
} from "../types/splitPane";

const MAX_SPLIT_DEPTH = 4;

interface SplitPaneStore {
  layouts: Map<string, TabLayout>;

  // Initialize a single-pane layout for a root session
  initLayout: (rootSessionId: string, sessionId: string) => void;

  // Split a pane in the given direction, creating a new terminal pane
  splitPane: (
    rootSessionId: string,
    paneId: PaneId,
    direction: SplitDirection,
    newSessionId: string
  ) => boolean;

  // Close a pane and cleanup the tree
  closePane: (rootSessionId: string, paneId: PaneId) => string | null;

  // Set the focused pane
  setFocusedPane: (rootSessionId: string, paneId: PaneId) => void;

  // Navigate focus to an adjacent pane
  navigateFocus: (rootSessionId: string, direction: NavigationDirection) => void;

  // Update sizes for a split node
  resizePanes: (rootSessionId: string, splitId: PaneId, sizes: [number, number]) => void;

  // Get the layout for a root session
  getLayout: (rootSessionId: string) => TabLayout | undefined;

  // Check if a root session has a split layout
  hasLayout: (rootSessionId: string) => boolean;

  // Remove layout (when closing last pane)
  removeLayout: (rootSessionId: string) => void;

  // Get all session IDs in a layout
  getAllSessionIds: (rootSessionId: string) => string[];

  // Get the session ID for a pane
  getSessionIdForPane: (rootSessionId: string, paneId: PaneId) => string | null;
}

// Generate unique pane ID
function generatePaneId(): PaneId {
  return `pane-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Calculate depth of a pane in the tree
function getPaneDepth(root: PaneNode, paneId: PaneId, depth = 0): number {
  if (root.id === paneId) return depth;
  if (root.type === "terminal") return -1;

  for (const child of root.children) {
    const d = getPaneDepth(child, paneId, depth + 1);
    if (d >= 0) return d;
  }
  return -1;
}

// Find a pane by ID
function findPane(root: PaneNode, paneId: PaneId): PaneNode | null {
  if (root.id === paneId) return root;
  if (root.type === "terminal") return null;

  for (const child of root.children) {
    const found = findPane(child, paneId);
    if (found) return found;
  }
  return null;
}

// Find the parent split node of a pane
function findParent(root: PaneNode, paneId: PaneId): SplitNode | null {
  if (root.type === "terminal") return null;

  for (const child of root.children) {
    if (child.id === paneId) return root;
    const found = findParent(child, paneId);
    if (found) return found;
  }
  return null;
}

// Replace a node in the tree
function replaceNode(root: PaneNode, targetId: PaneId, newNode: PaneNode): PaneNode {
  if (root.id === targetId) return newNode;
  if (root.type === "terminal") return root;

  return {
    ...root,
    children: root.children.map((child) =>
      replaceNode(child, targetId, newNode)
    ) as [PaneNode, PaneNode],
  };
}

// Get all terminal panes in the tree
function getAllTerminalPanes(root: PaneNode): TerminalPane[] {
  if (root.type === "terminal") return [root];
  return root.children.flatMap(getAllTerminalPanes);
}

// Get the first terminal pane in a subtree
function getFirstTerminalPane(node: PaneNode): TerminalPane {
  if (node.type === "terminal") return node;
  return getFirstTerminalPane(node.children[0]);
}

// Get the last terminal pane in a subtree
function getLastTerminalPane(node: PaneNode): TerminalPane {
  if (node.type === "terminal") return node;
  return getLastTerminalPane(node.children[1]);
}

// Navigate to adjacent pane based on direction
function findAdjacentPane(
  root: PaneNode,
  currentPaneId: PaneId,
  direction: NavigationDirection
): TerminalPane | null {
  // Build a path from root to current pane
  const path: { node: SplitNode; childIndex: 0 | 1 }[] = [];

  function buildPath(node: PaneNode, targetId: PaneId): boolean {
    if (node.id === targetId) return true;
    if (node.type === "terminal") return false;

    for (let i = 0; i < 2; i++) {
      if (buildPath(node.children[i], targetId)) {
        path.unshift({ node, childIndex: i as 0 | 1 });
        return true;
      }
    }
    return false;
  }

  buildPath(root, currentPaneId);

  // Determine which split direction and child movement we need
  const isHorizontalDir = direction === "left" || direction === "right";
  const isPositiveDir = direction === "right" || direction === "down";
  const requiredSplitDir: SplitDirection = isHorizontalDir ? "horizontal" : "vertical";

  // Walk up the path to find a relevant split
  for (let i = path.length - 1; i >= 0; i--) {
    const { node, childIndex } = path[i];

    // Check if this split is in the right direction
    if (node.direction === requiredSplitDir) {
      // Check if we can move in the desired direction
      const targetIndex = isPositiveDir ? 1 : 0;
      if (childIndex !== targetIndex) {
        // We can move to the sibling
        const sibling = node.children[targetIndex];
        // Return the nearest terminal in that direction
        return isPositiveDir
          ? getFirstTerminalPane(sibling)
          : getLastTerminalPane(sibling);
      }
    }
  }

  return null;
}

export const useSplitPaneStore = create<SplitPaneStore>((set, get) => ({
  layouts: new Map(),

  initLayout: (rootSessionId: string, sessionId: string) => {
    set((state) => {
      const newLayouts = new Map(state.layouts);
      const paneId = generatePaneId();
      newLayouts.set(rootSessionId, {
        root: {
          type: "terminal",
          id: paneId,
          sessionId,
        },
        focusedPaneId: paneId,
      });
      return { layouts: newLayouts };
    });
  },

  splitPane: (
    rootSessionId: string,
    paneId: PaneId,
    direction: SplitDirection,
    newSessionId: string
  ) => {
    const layout = get().layouts.get(rootSessionId);
    if (!layout) return false;

    // Check depth limit
    const depth = getPaneDepth(layout.root, paneId);
    if (depth < 0 || depth >= MAX_SPLIT_DEPTH) return false;

    const currentPane = findPane(layout.root, paneId);
    if (!currentPane || currentPane.type !== "terminal") return false;

    // Create new pane and split node
    const newPaneId = generatePaneId();
    const newPane: TerminalPane = {
      type: "terminal",
      id: newPaneId,
      sessionId: newSessionId,
    };

    const splitNode: SplitNode = {
      type: "split",
      id: generatePaneId(),
      direction,
      children: [currentPane, newPane],
      sizes: [50, 50],
    };

    // Replace the current pane with the split node
    const newRoot = replaceNode(layout.root, paneId, splitNode);

    set((state) => {
      const newLayouts = new Map(state.layouts);
      newLayouts.set(rootSessionId, {
        root: newRoot,
        focusedPaneId: newPaneId, // Focus the new pane
      });
      return { layouts: newLayouts };
    });

    return true;
  },

  closePane: (rootSessionId: string, paneId: PaneId) => {
    const layout = get().layouts.get(rootSessionId);
    if (!layout) return null;

    const pane = findPane(layout.root, paneId);
    if (!pane || pane.type !== "terminal") return null;

    const sessionId = pane.sessionId;

    // If this is the only pane, signal that the tab should close
    if (layout.root.id === paneId) {
      get().removeLayout(rootSessionId);
      return sessionId;
    }

    // Find the parent and sibling
    const parent = findParent(layout.root, paneId);
    if (!parent) return sessionId;

    const siblingIndex = parent.children[0].id === paneId ? 1 : 0;
    const sibling = parent.children[siblingIndex];

    // Replace the parent split with the sibling
    const newRoot = replaceNode(layout.root, parent.id, sibling);

    // Determine new focus - first terminal in sibling subtree
    const newFocusedPane = getFirstTerminalPane(sibling);

    set((state) => {
      const newLayouts = new Map(state.layouts);
      newLayouts.set(rootSessionId, {
        root: newRoot,
        focusedPaneId: newFocusedPane.id,
      });
      return { layouts: newLayouts };
    });

    return sessionId;
  },

  setFocusedPane: (rootSessionId: string, paneId: PaneId) => {
    set((state) => {
      const layout = state.layouts.get(rootSessionId);
      if (!layout) return state;

      const newLayouts = new Map(state.layouts);
      newLayouts.set(rootSessionId, {
        ...layout,
        focusedPaneId: paneId,
      });
      return { layouts: newLayouts };
    });
  },

  navigateFocus: (rootSessionId: string, direction: NavigationDirection) => {
    const layout = get().layouts.get(rootSessionId);
    if (!layout) return;

    const adjacent = findAdjacentPane(layout.root, layout.focusedPaneId, direction);
    if (adjacent) {
      get().setFocusedPane(rootSessionId, adjacent.id);
    }
  },

  resizePanes: (rootSessionId: string, splitId: PaneId, sizes: [number, number]) => {
    set((state) => {
      const layout = state.layouts.get(rootSessionId);
      if (!layout) return state;

      const splitNode = findPane(layout.root, splitId);
      if (!splitNode || splitNode.type !== "split") return state;

      // Check if sizes actually changed (avoid floating point comparison issues)
      const [oldSize0, oldSize1] = splitNode.sizes;
      const [newSize0, newSize1] = sizes;
      if (Math.abs(oldSize0 - newSize0) < 0.1 && Math.abs(oldSize1 - newSize1) < 0.1) {
        return state; // Sizes didn't change, skip update
      }

      const newSplitNode: SplitNode = { ...splitNode, sizes };
      const newRoot = replaceNode(layout.root, splitId, newSplitNode);

      const newLayouts = new Map(state.layouts);
      newLayouts.set(rootSessionId, {
        ...layout,
        root: newRoot,
      });
      return { layouts: newLayouts };
    });
  },

  getLayout: (rootSessionId: string) => {
    return get().layouts.get(rootSessionId);
  },

  hasLayout: (rootSessionId: string) => {
    return get().layouts.has(rootSessionId);
  },

  removeLayout: (rootSessionId: string) => {
    set((state) => {
      const newLayouts = new Map(state.layouts);
      newLayouts.delete(rootSessionId);
      return { layouts: newLayouts };
    });
  },

  getAllSessionIds: (rootSessionId: string) => {
    const layout = get().layouts.get(rootSessionId);
    if (!layout) return [];
    return getAllTerminalPanes(layout.root).map((p) => p.sessionId);
  },

  getSessionIdForPane: (rootSessionId: string, paneId: PaneId) => {
    const layout = get().layouts.get(rootSessionId);
    if (!layout) return null;
    const pane = findPane(layout.root, paneId);
    if (!pane || pane.type !== "terminal") return null;
    return pane.sessionId;
  },
}));
