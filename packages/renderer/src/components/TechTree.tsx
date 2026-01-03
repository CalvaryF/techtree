import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ComputedTechTree, ComputedTechNode } from "@techtree/core";
import { getAncestors, getDescendants } from "@techtree/core";
import { TechNode } from "./TechNode.js";

export interface TechTreeProps {
  tree: ComputedTechTree;
  selectedNodeId?: string | null;
  onNodeClick?: (node: ComputedTechNode) => void;
  onNodeDoubleClick?: (node: ComputedTechNode) => void;
  onBackgroundClick?: () => void;
}

const nodeTypes = {
  techNode: TechNode,
} as const;

export function TechTree({
  tree,
  selectedNodeId,
  onNodeClick,
  onNodeDoubleClick,
  onBackgroundClick,
}: TechTreeProps) {
  // Calculate highlighted nodes based on selection
  const { highlightedNodes, dimmedNodes } = useMemo(() => {
    if (!selectedNodeId) {
      return { highlightedNodes: undefined, dimmedNodes: undefined };
    }

    const ancestors = getAncestors(selectedNodeId, tree);
    const descendants = getDescendants(selectedNodeId, tree);
    const highlighted = new Set<string>([selectedNodeId, ...ancestors, ...descendants]);
    const dimmed = new Set<string>();

    for (const node of tree.nodes) {
      if (!highlighted.has(node.id)) {
        dimmed.add(node.id);
      }
    }

    return { highlightedNodes: highlighted, dimmedNodes: dimmed };
  }, [selectedNodeId, tree]);

  // Convert to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    const nodeWidth = 224;
    const nodeHeight = 80;
    const horizontalGap = 40;
    const verticalGap = 80;

    // Group nodes by tier
    const tiers = new Map<number, ComputedTechNode[]>();
    for (const node of tree.nodes) {
      const tier = node.computedTier;
      if (!tiers.has(tier)) tiers.set(tier, []);
      tiers.get(tier)!.push(node);
    }

    const sortedTiers = Array.from(tiers.keys()).sort((a, b) => a - b);
    const nodes: Node[] = [];

    sortedTiers.forEach((tier, tierIndex) => {
      const tierNodes = tiers.get(tier)!;
      const tierWidth = tierNodes.length * nodeWidth + (tierNodes.length - 1) * horizontalGap;
      const startX = -tierWidth / 2 + nodeWidth / 2;

      tierNodes.forEach((node, nodeIndex) => {
        nodes.push({
          id: node.id,
          type: "techNode",
          position: {
            x: startX + nodeIndex * (nodeWidth + horizontalGap),
            y: tierIndex * (nodeHeight + verticalGap),
          },
          data: {
            node,
            isHighlighted: highlightedNodes?.has(node.id) ?? false,
            isDimmed: dimmedNodes?.has(node.id) ?? false,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      });
    });

    return nodes;
  }, [tree.nodes, highlightedNodes, dimmedNodes]);

  // Convert to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    for (const node of tree.nodes) {
      for (const prereqId of node.prerequisites) {
        const isHighlighted =
          highlightedNodes?.has(node.id) && highlightedNodes?.has(prereqId);

        edges.push({
          id: `${prereqId}-${node.id}`,
          source: prereqId,
          target: node.id,
          style: {
            stroke: isHighlighted ? "#737373" : "#d4d4d4",
            strokeWidth: 1,
          },
        });
      }
    }

    return edges;
  }, [tree.nodes, highlightedNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when selection changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const techNode = tree.nodes.find((n) => n.id === node.id);
      if (techNode) {
        onNodeClick?.(techNode);
      }
    },
    [tree.nodes, onNodeClick]
  );

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const techNode = tree.nodes.find((n) => n.id === node.id);
      if (techNode) {
        onNodeDoubleClick?.(techNode);
      }
    },
    [tree.nodes, onNodeDoubleClick]
  );

  const handlePaneClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  return (
    <div className="tech-tree-container flex flex-col h-full bg-neutral-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-neutral-200 bg-white">
        <h1 className="text-lg font-semibold text-neutral-900">{tree.name}</h1>
        {tree.description && (
          <p className="text-sm text-neutral-500 mt-0.5">{tree.description}</p>
        )}
      </div>

      {/* Flow */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="#e5e5e5" gap={20} />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-neutral-200 bg-white flex items-center gap-6 text-xs text-neutral-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-300" />
          <span>Planned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Blocked</span>
        </div>
      </div>
    </div>
  );
}
