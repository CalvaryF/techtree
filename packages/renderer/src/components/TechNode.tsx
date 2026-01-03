import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { ComputedTechNode, NodeStatus } from "@techtree/core";

export interface TechNodeData {
  node: ComputedTechNode;
  isHighlighted: boolean;
  isDimmed: boolean;
}

interface TechNodeProps {
  data: TechNodeData;
}

const STATUS_STYLES: Record<NodeStatus, { border: string; dot: string }> = {
  completed: {
    border: "border-neutral-200",
    dot: "bg-emerald-500",
  },
  "in-progress": {
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  planned: {
    border: "border-neutral-200",
    dot: "bg-neutral-300",
  },
  blocked: {
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
};

export const TechNode = memo(({ data }: TechNodeProps) => {
  const { node, isHighlighted, isDimmed } = data;
  const styles = STATUS_STYLES[node.status];

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-neutral-300 !w-2 !h-2 !border-0" />
      <div
        className={`
          w-56 px-4 py-3 rounded-md border bg-white
          transition-all cursor-pointer select-none
          ${styles.border}
          ${isHighlighted ? "border-neutral-500" : ""}
          ${isDimmed ? "opacity-50" : "opacity-100"}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
          <span className="font-medium text-sm text-neutral-900 truncate flex-1">
            {node.name}
          </span>
          {node.subtree && (
            <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          )}
          {node.devPoints !== undefined && (
            <span className="text-xs text-neutral-400 flex-shrink-0">
              {node.devPoints}
            </span>
          )}
        </div>

        {/* Description */}
        {node.description && (
          <p className="mt-1.5 text-xs text-neutral-500 line-clamp-2">
            {node.description}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-neutral-300 !w-2 !h-2 !border-0" />
    </>
  );
});

TechNode.displayName = "TechNode";
