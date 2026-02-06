import { useCallback, useRef } from "react";
import { Panel, Group as PanelGroup, Separator } from "react-resizable-panels";
import { PaneNode, SplitNode } from "../../types/splitPane";
import { useSplitPaneStore } from "../../stores/splitPaneStore";
import TerminalPaneWrapper from "./TerminalPaneWrapper";

interface SplitPaneContainerProps {
  rootSessionId: string;
}

interface PaneNodeRendererProps {
  node: PaneNode;
  rootSessionId: string;
}

function ResizeHandle({ direction }: { direction: "horizontal" | "vertical" }) {
  const isHorizontal = direction === "horizontal";
  return (
    <Separator
      className={`
        ${isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
        bg-border-subtle hover:bg-accent-primary transition-colors
        flex items-center justify-center
      `}
    >
      <div
        className={`
          ${isHorizontal ? "w-0.5 h-8" : "h-0.5 w-8"}
          bg-bg-hover rounded
        `}
      />
    </Separator>
  );
}

function SplitNodeRenderer({
  node,
  rootSessionId,
}: {
  node: SplitNode;
  rootSessionId: string;
}) {
  const resizePanes = useSplitPaneStore((state) => state.resizePanes);
  const firstPanelId = `panel-${node.id}-0`;
  const secondPanelId = `panel-${node.id}-1`;

  // Refs for rAF throttling
  const pendingSizesRef = useRef<{ [key: string]: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleLayoutChange = useCallback(
    (layout: { [id: string]: number }) => {
      // Store the latest size values
      pendingSizesRef.current = layout;

      // If an rAF is already scheduled, don't schedule another
      if (rafIdRef.current !== null) return;

      // Throttle using requestAnimationFrame
      rafIdRef.current = requestAnimationFrame(() => {
        const sizes = pendingSizesRef.current;
        if (sizes) {
          const size0 = sizes[firstPanelId];
          const size1 = sizes[secondPanelId];
          if (size0 !== undefined && size1 !== undefined) {
            resizePanes(rootSessionId, node.id, [size0, size1]);
          }
        }
        pendingSizesRef.current = null;
        rafIdRef.current = null;
      });
    },
    [rootSessionId, node.id, firstPanelId, secondPanelId, resizePanes]
  );

  return (
    <PanelGroup
      orientation={node.direction}
      onLayoutChange={handleLayoutChange}
      className="flex-1 min-h-0 min-w-0"
    >
      <Panel
        id={firstPanelId}
        defaultSize={node.sizes[0]}
        minSize={10}
        className="flex flex-col"
      >
        <PaneNodeRenderer key={node.children[0].id} node={node.children[0]} rootSessionId={rootSessionId} />
      </Panel>
      <ResizeHandle direction={node.direction} />
      <Panel
        id={secondPanelId}
        defaultSize={node.sizes[1]}
        minSize={10}
        className="flex flex-col"
      >
        <PaneNodeRenderer key={node.children[1].id} node={node.children[1]} rootSessionId={rootSessionId} />
      </Panel>
    </PanelGroup>
  );
}

function PaneNodeRenderer({ node, rootSessionId }: PaneNodeRendererProps) {
  if (node.type === "terminal") {
    return (
      <TerminalPaneWrapper
        rootSessionId={rootSessionId}
        paneId={node.id}
        sessionId={node.sessionId}
      />
    );
  }

  return <SplitNodeRenderer node={node} rootSessionId={rootSessionId} />;
}

export default function SplitPaneContainer({
  rootSessionId,
}: SplitPaneContainerProps) {
  const layout = useSplitPaneStore((state) => state.layouts.get(rootSessionId));

  if (!layout) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <PaneNodeRenderer node={layout.root} rootSessionId={rootSessionId} />
    </div>
  );
}
