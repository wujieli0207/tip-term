import { create } from "zustand";
import {
  SplitPaneNode,
  SplitPaneStore,
  SplitDirection,
  FocusDirection,
} from "../types/splitPane";

const MAX_NESTING_LEVEL = 4;

// Helper to generate unique IDs
let paneCounter = 0;
function generatePaneId(): string {
  return `pane-${++paneCounter}-${Date.now()}`;
}

// Helper to find a node by ID in the tree
function findNodeById(
  tree: SplitPaneNode | null,
  id: string
): SplitPaneNode | null {
  if (!tree) return null;
  if (tree.id === id) return tree;
  if (tree.type === "split") {
    return findNodeById(tree.children[0], id) || findNodeById(tree.children[1], id);
  }
  return null;
}

// Helper to find a node by ptyId
function findNodeByPtyId(
  tree: SplitPaneNode | null,
  ptyId: string
): SplitPaneNode | null {
  if (!tree) return null;
  if (tree.type === "terminal" && tree.ptyId === ptyId) return tree;
  if (tree.type === "split") {
    return (
      findNodeByPtyId(tree.children[0], ptyId) ||
      findNodeByPtyId(tree.children[1], ptyId)
    );
  }
  return null;
}

// Helper to calculate nesting level
function calculateNestingLevel(tree: SplitPaneNode | null): number {
  if (!tree) return 0;
  if (tree.type === "terminal") return 0;
  return (
    1 +
    Math.max(
      calculateNestingLevel(tree.children[0]),
      calculateNestingLevel(tree.children[1])
    )
  );
}

// Helper to replace a node in the tree (immutably)
function replaceNode(
  tree: SplitPaneNode,
  targetId: string,
  newNode: SplitPaneNode
): SplitPaneNode {
  if (tree.id === targetId) return newNode;
  if (tree.type === "terminal") return tree;

  return {
    ...tree,
    children: [
      replaceNode(tree.children[0], targetId, newNode),
      replaceNode(tree.children[1], targetId, newNode),
    ] as [SplitPaneNode, SplitPaneNode],
  };
}

// Helper to remove a node from tree
function removeNode(
  tree: SplitPaneNode,
  targetId: string
): SplitPaneNode | null {
  if (tree.id === targetId) return null;
  if (tree.type === "terminal") return tree;

  const child0Removed = tree.children[0].id === targetId;
  const child1Removed = tree.children[1].id === targetId;

  if (child0Removed) return tree.children[1];
  if (child1Removed) return tree.children[0];

  const newChild0 = removeNode(tree.children[0], targetId);
  const newChild1 = removeNode(tree.children[1], targetId);

  if (newChild0 === null) return newChild1;
  if (newChild1 === null) return newChild0;

  return {
    ...tree,
    children: [newChild0, newChild1] as [SplitPaneNode, SplitPaneNode],
  };
}

// Helper to collect all terminal panes
function collectTerminalPanes(tree: SplitPaneNode | null): SplitPaneNode[] {
  if (!tree) return [];
  if (tree.type === "terminal") return [tree];
  return [
    ...collectTerminalPanes(tree.children[0]),
    ...collectTerminalPanes(tree.children[1]),
  ];
}

// Helper to get pane position (for focus navigation)
interface PanePosition {
  paneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function calculatePanePositions(
  tree: SplitPaneNode | null,
  x = 0,
  y = 0,
  width = 100,
  height = 100
): PanePosition[] {
  if (!tree) return [];
  if (tree.type === "terminal") {
    return [{ paneId: tree.id, x, y, width, height }];
  }

  const ratio = tree.ratio;
  if (tree.direction === "vertical") {
    // Split left/right
    const leftWidth = width * ratio;
    const rightWidth = width * (1 - ratio);
    return [
      ...calculatePanePositions(tree.children[0], x, y, leftWidth, height),
      ...calculatePanePositions(
        tree.children[1],
        x + leftWidth,
        y,
        rightWidth,
        height
      ),
    ];
  } else {
    // Split top/bottom
    const topHeight = height * ratio;
    const bottomHeight = height * (1 - ratio);
    return [
      ...calculatePanePositions(tree.children[0], x, y, width, topHeight),
      ...calculatePanePositions(
        tree.children[1],
        x,
        y + topHeight,
        width,
        bottomHeight
      ),
    ];
  }
}

// Helper to find adjacent pane in a direction
function findAdjacentPane(
  positions: PanePosition[],
  currentId: string,
  direction: FocusDirection
): string | null {
  const current = positions.find((p) => p.paneId === currentId);
  if (!current) return null;

  const currentCenterX = current.x + current.width / 2;
  const currentCenterY = current.y + current.height / 2;

  const candidates: { paneId: string; distance: number }[] = [];

  for (const pos of positions) {
    if (pos.paneId === currentId) continue;

    const posCenterX = pos.x + pos.width / 2;
    const posCenterY = pos.y + pos.height / 2;

    let isValidDirection = false;
    let distance = 0;

    switch (direction) {
      case "left":
        isValidDirection = posCenterX < currentCenterX;
        distance = currentCenterX - posCenterX + Math.abs(posCenterY - currentCenterY) * 0.5;
        break;
      case "right":
        isValidDirection = posCenterX > currentCenterX;
        distance = posCenterX - currentCenterX + Math.abs(posCenterY - currentCenterY) * 0.5;
        break;
      case "up":
        isValidDirection = posCenterY < currentCenterY;
        distance = currentCenterY - posCenterY + Math.abs(posCenterX - currentCenterX) * 0.5;
        break;
      case "down":
        isValidDirection = posCenterY > currentCenterY;
        distance = posCenterY - currentCenterY + Math.abs(posCenterX - currentCenterX) * 0.5;
        break;
    }

    if (isValidDirection) {
      candidates.push({ paneId: pos.paneId, distance });
    }
  }

  if (candidates.length === 0) return null;

  // Return the closest pane in that direction
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0].paneId;
}

export const useSplitPaneStore = create<SplitPaneStore>((set, get) => ({
  // State - per-session layouts
  layoutTrees: new Map(),
  focusedPanes: new Map(),
  paneElements: new Map(),

  // Getters
  getLayoutForSession: (sessionId: string) => {
    return get().layoutTrees.get(sessionId) ?? null;
  },

  getFocusedPaneForSession: (sessionId: string) => {
    return get().focusedPanes.get(sessionId) ?? null;
  },

  // Actions
  initializeLayout: (sessionId: string, ptyId: string) => {
    const paneId = generatePaneId();
    set((state) => {
      const newLayoutTrees = new Map(state.layoutTrees);
      const newFocusedPanes = new Map(state.focusedPanes);

      newLayoutTrees.set(sessionId, {
        type: "terminal",
        id: paneId,
        ptyId,
      });
      newFocusedPanes.set(sessionId, paneId);

      return {
        layoutTrees: newLayoutTrees,
        focusedPanes: newFocusedPanes,
      };
    });
  },

  splitPane: (sessionId: string, paneId: string, direction: SplitDirection, newPtyId: string) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId);
    if (!layoutTree) return false;

    // Check nesting level
    if (calculateNestingLevel(layoutTree) >= MAX_NESTING_LEVEL) {
      console.warn("Maximum nesting level reached");
      return false;
    }

    const targetPane = findNodeById(layoutTree, paneId);
    if (!targetPane || targetPane.type !== "terminal") return false;

    const newPaneId = generatePaneId();
    const splitId = generatePaneId();

    const newSplitNode: SplitPaneNode = {
      type: "split",
      id: splitId,
      direction,
      ratio: 0.5,
      children: [
        targetPane,
        {
          type: "terminal",
          id: newPaneId,
          ptyId: newPtyId,
        },
      ],
    };

    const newTree = replaceNode(layoutTree, paneId, newSplitNode);

    set((state) => {
      const newLayoutTrees = new Map(state.layoutTrees);
      const newFocusedPanes = new Map(state.focusedPanes);

      newLayoutTrees.set(sessionId, newTree);
      newFocusedPanes.set(sessionId, newPaneId);

      return {
        layoutTrees: newLayoutTrees,
        focusedPanes: newFocusedPanes,
      };
    });
    return true;
  },

  closePane: (sessionId: string, paneId: string) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId);
    if (!layoutTree) return null;

    // Find the pane to get its ptyId before removing
    const closingPane = findNodeById(layoutTree, paneId);
    if (!closingPane || closingPane.type !== "terminal") return null;

    const removedPtyId = closingPane.ptyId;

    // If this is the only pane, clear the layout for this session
    if (layoutTree.id === paneId) {
      set((state) => {
        const newLayoutTrees = new Map(state.layoutTrees);
        const newFocusedPanes = new Map(state.focusedPanes);

        newLayoutTrees.delete(sessionId);
        newFocusedPanes.delete(sessionId);

        return {
          layoutTrees: newLayoutTrees,
          focusedPanes: newFocusedPanes,
        };
      });
      return { removedPtyId };
    }

    const newTree = removeNode(layoutTree, paneId);

    // If focused pane was closed, focus another pane
    const currentFocused = state.focusedPanes.get(sessionId);
    let newFocusedPaneId = currentFocused;
    if (currentFocused === paneId && newTree) {
      const terminals = collectTerminalPanes(newTree);
      newFocusedPaneId = terminals.length > 0 ? terminals[0].id : null;
    }

    set((state) => {
      const newLayoutTrees = new Map(state.layoutTrees);
      const newFocusedPanes = new Map(state.focusedPanes);

      newLayoutTrees.set(sessionId, newTree);
      if (newFocusedPaneId) {
        newFocusedPanes.set(sessionId, newFocusedPaneId);
      } else {
        newFocusedPanes.delete(sessionId);
      }

      return {
        layoutTrees: newLayoutTrees,
        focusedPanes: newFocusedPanes,
      };
    });

    return { removedPtyId };
  },

  setFocusedPane: (sessionId: string, paneId: string) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId) ?? null;
    const pane = findNodeById(layoutTree, paneId);
    if (pane && pane.type === "terminal") {
      set((state) => {
        const newFocusedPanes = new Map(state.focusedPanes);
        newFocusedPanes.set(sessionId, paneId);
        return { focusedPanes: newFocusedPanes };
      });
    }
  },

  updateSplitRatio: (sessionId: string, splitId: string, ratio: number) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId);
    if (!layoutTree) return;

    const clampedRatio = Math.max(0.1, Math.min(0.9, ratio));

    const updateRatio = (node: SplitPaneNode): SplitPaneNode => {
      if (node.id === splitId && node.type === "split") {
        return { ...node, ratio: clampedRatio };
      }
      if (node.type === "split") {
        return {
          ...node,
          children: [
            updateRatio(node.children[0]),
            updateRatio(node.children[1]),
          ] as [SplitPaneNode, SplitPaneNode],
        };
      }
      return node;
    };

    set((state) => {
      const newLayoutTrees = new Map(state.layoutTrees);
      newLayoutTrees.set(sessionId, updateRatio(layoutTree));
      return { layoutTrees: newLayoutTrees };
    });
  },

  moveFocus: (sessionId: string, direction: FocusDirection) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId);
    const focusedPaneId = state.focusedPanes.get(sessionId);
    if (!layoutTree || !focusedPaneId) return;

    const positions = calculatePanePositions(layoutTree);
    const nextPaneId = findAdjacentPane(positions, focusedPaneId, direction);

    if (nextPaneId) {
      set((state) => {
        const newFocusedPanes = new Map(state.focusedPanes);
        newFocusedPanes.set(sessionId, nextPaneId);
        return { focusedPanes: newFocusedPanes };
      });
    }
  },

  // Pane element registration
  registerPaneElement: (paneId: string, ptyId: string, element: HTMLElement) => {
    set((state) => {
      const newPaneElements = new Map(state.paneElements);
      newPaneElements.set(paneId, { paneId, ptyId, element });
      return { paneElements: newPaneElements };
    });
  },

  unregisterPaneElement: (paneId: string) => {
    set((state) => {
      const newPaneElements = new Map(state.paneElements);
      newPaneElements.delete(paneId);
      return { paneElements: newPaneElements };
    });
  },

  getPaneElementForPty: (ptyId: string) => {
    const state = get();
    for (const info of state.paneElements.values()) {
      if (info.ptyId === ptyId) {
        return info;
      }
    }
    return null;
  },

  // Helpers
  findPaneByPtyId: (sessionId: string, ptyId: string) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId) ?? null;
    return findNodeByPtyId(layoutTree, ptyId);
  },

  getNestingLevel: (sessionId: string) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId) ?? null;
    return calculateNestingLevel(layoutTree);
  },

  clearLayoutForSession: (sessionId: string) => {
    set((state) => {
      const newLayoutTrees = new Map(state.layoutTrees);
      const newFocusedPanes = new Map(state.focusedPanes);

      newLayoutTrees.delete(sessionId);
      newFocusedPanes.delete(sessionId);

      // Also clean up pane elements for this session
      const newPaneElements = new Map(state.paneElements);
      const layoutTree = state.layoutTrees.get(sessionId);
      if (layoutTree) {
        const terminals = collectTerminalPanes(layoutTree);
        for (const terminal of terminals) {
          newPaneElements.delete(terminal.id);
        }
      }

      return {
        layoutTrees: newLayoutTrees,
        focusedPanes: newFocusedPanes,
        paneElements: newPaneElements,
      };
    });
  },

  removePtyFromLayout: (sessionId: string, ptyId: string) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId) ?? null;
    const pane = findNodeByPtyId(layoutTree, ptyId);
    if (pane) {
      get().closePane(sessionId, pane.id);
    }
  },

  getPtysInLayout: (sessionId: string) => {
    const state = get();
    const layoutTree = state.layoutTrees.get(sessionId) ?? null;
    const terminals = collectTerminalPanes(layoutTree);
    return terminals.map((t) => (t as { ptyId: string }).ptyId);
  },
}));
