import { z } from "zod";

/**
 * Node status represents the development state of a capability
 */
export const NodeStatusSchema = z.enum([
  "completed",
  "in-progress",
  "planned",
  "blocked",
]);

export type NodeStatus = z.infer<typeof NodeStatusSchema>;

/**
 * A capability node in the tech tree
 */
export const TechNodeSchema = z.object({
  /** Unique identifier for the node */
  id: z.string().min(1),

  /** Display name of the capability */
  name: z.string().min(1),

  /** Description of what this capability provides */
  description: z.string().optional(),

  /** Repository URL or identifier associated with this capability */
  repo: z.string().optional(),

  /** Explicit tier level (auto-calculated if omitted) */
  tier: z.number().int().positive().optional(),

  /** Current development status */
  status: NodeStatusSchema.default("planned"),

  /** IDs of capabilities that must be completed first */
  prerequisites: z.array(z.string()).default([]),

  /** Development effort/complexity score */
  devPoints: z.number().int().nonnegative().optional(),

  /** Reason for blocked status */
  blockedReason: z.string().optional(),

  /** Tags for categorization */
  tags: z.array(z.string()).default([]),

  /** Reference to a subtree (tree file name without .yaml extension) */
  subtree: z.string().optional(),
});

export type TechNode = z.infer<typeof TechNodeSchema>;

/**
 * A complete tech tree specification
 */
export const TechTreeSchema = z.object({
  /** Name of the tech tree */
  name: z.string().min(1),

  /** Version of this spec */
  version: z.string().default("1.0.0"),

  /** Description of what this tree represents */
  description: z.string().optional(),

  /** All capability nodes in the tree */
  nodes: z.array(TechNodeSchema).min(1),
});

export type TechTree = z.infer<typeof TechTreeSchema>;

/**
 * A node with computed properties (like calculated tier and position)
 */
export interface ComputedTechNode extends TechNode {
  /** Calculated tier based on prerequisites */
  computedTier: number;

  /** Node IDs that depend on this node */
  dependents: string[];
}

/**
 * A tech tree with computed node properties
 */
export interface ComputedTechTree extends Omit<TechTree, "nodes"> {
  nodes: ComputedTechNode[];

  /** Nodes grouped by tier for rendering */
  tiers: Map<number, ComputedTechNode[]>;

  /** Total dev points across all nodes */
  totalDevPoints: number;

  /** Dev points for completed nodes */
  completedDevPoints: number;
}
