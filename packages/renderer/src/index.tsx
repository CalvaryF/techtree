// Components
export { TechTree, type TechTreeProps } from "./components/TechTree.js";
export { TechNode } from "./components/TechNode.js";

// Hooks
export { useTechTree, type UseTechTreeResult } from "./hooks/useTechTree.js";

// Re-export core types for convenience
export type {
  TechTree as TechTreeSpec,
  ComputedTechTree,
  TechNode as TechNodeSpec,
  ComputedTechNode,
  NodeStatus,
} from "@techtree/core";
