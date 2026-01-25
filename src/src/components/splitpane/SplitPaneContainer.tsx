import { Group, Panel, Separator } from "react-resizable-panels";
import { useSplitPaneStore } from "../../stores/splitPaneStore";
import { SplitPaneNode } from "../../types/splitPane";
import TerminalPane from "./TerminalPane";

interface SplitPaneContainerProps {
  sessionId: string;
}

interface SplitPaneRendererProps {
  node: SplitPaneNode;
  sessionId: string;
}

function SplitPaneRenderer({ node, sessionId }: SplitPaneRendererProps) {
  const updateSplitRatio = useSplitPaneStore((state) => state.updateSplitRatio);

  if (node.type === "terminal") {
    return <TerminalPane paneId={node.id} ptyId={node.ptyId} sessionId={sessionId} />;
  }

  // For split nodes, render a Group with two panels
  // In react-resizable-panels, "horizontal" means left/right split, "vertical" means top/bottom
  // Our "vertical" direction means split left/right (vertical divider)
  // Our "horizontal" direction means split top/bottom (horizontal divider)
  const orientation = node.direction === "vertical" ? "horizontal" : "vertical";

  const handleLayoutChange = (layout: { [panelId: string]: number }) => {
    const firstPanelSize = layout[`${node.id}-0`];
    if (firstPanelSize !== undefined) {
      const ratio = firstPanelSize / 100;
      updateSplitRatio(sessionId, node.id, ratio);
    }
  };

  return (
    <Group
      orientation={orientation}
      onLayoutChanged={handleLayoutChange}
      className="h-full w-full"
    >
      <Panel id={`${node.id}-0`} defaultSize={node.ratio * 100} minSize={10}>
        <SplitPaneRenderer node={node.children[0]} sessionId={sessionId} />
      </Panel>
      <Separator className={`${
        orientation === "horizontal"
          ? "w-1 cursor-col-resize hover:bg-purple-500/30"
          : "h-1 cursor-row-resize hover:bg-purple-500/30"
      } bg-[#1a1a1a] transition-colors`} />
      <Panel id={`${node.id}-1`} defaultSize={(1 - node.ratio) * 100} minSize={10}>
        <SplitPaneRenderer node={node.children[1]} sessionId={sessionId} />
      </Panel>
    </Group>
  );
}

export default function SplitPaneContainer({ sessionId }: SplitPaneContainerProps) {
  const layoutTree = useSplitPaneStore((state) => state.layoutTrees.get(sessionId) ?? null);

  if (!layoutTree) {
    return null;
  }

  return (
    <div className="flex-1 h-full">
      <SplitPaneRenderer node={layoutTree} sessionId={sessionId} />
    </div>
  );
}
