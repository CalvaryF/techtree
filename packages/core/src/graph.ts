import type {
  TechTree,
  TechNode,
  ComputedTechNode,
  ComputedTechTree,
} from "./schema.js";

/**
 * Compute tiers and build a dependency graph from a tech tree
 * Returns the tree with computed properties for each node
 */
export function computeTechTree(tree: TechTree): ComputedTechTree {
  const nodeMap = new Map<string, TechNode>();
  const dependentsMap = new Map<string, string[]>();

  // Build lookup maps
  for (const node of tree.nodes) {
    nodeMap.set(node.id, node);
    dependentsMap.set(node.id, []);
  }

  // Build dependents (reverse of prerequisites)
  for (const node of tree.nodes) {
    for (const prereq of node.prerequisites) {
      const deps = dependentsMap.get(prereq);
      if (deps) {
        deps.push(node.id);
      }
    }
  }

  // Calculate tiers using topological sort approach
  const tiers = calculateTiers(tree.nodes, nodeMap);

  // Build computed nodes
  const computedNodes: ComputedTechNode[] = tree.nodes.map((node) => ({
    ...node,
    computedTier: node.tier ?? tiers.get(node.id) ?? 1,
    dependents: dependentsMap.get(node.id) ?? [],
  }));

  // Group nodes by tier
  const tierGroups = new Map<number, ComputedTechNode[]>();
  for (const node of computedNodes) {
    const tier = node.computedTier;
    if (!tierGroups.has(tier)) {
      tierGroups.set(tier, []);
    }
    tierGroups.get(tier)!.push(node);
  }

  // Calculate dev points
  let totalDevPoints = 0;
  let completedDevPoints = 0;

  for (const node of computedNodes) {
    const points = node.devPoints ?? 0;
    totalDevPoints += points;
    if (node.status === "completed") {
      completedDevPoints += points;
    }
  }

  return {
    name: tree.name,
    version: tree.version,
    description: tree.description,
    nodes: computedNodes,
    tiers: tierGroups,
    totalDevPoints,
    completedDevPoints,
  };
}

/**
 * Calculate tier for each node based on prerequisites
 * Tier = 1 + max(tier of all prerequisites)
 * Nodes with no prerequisites are tier 1
 */
function calculateTiers(
  nodes: TechNode[],
  nodeMap: Map<string, TechNode>
): Map<string, number> {
  const tiers = new Map<string, number>();
  const visiting = new Set<string>();

  function getTier(nodeId: string): number {
    // Return cached result
    if (tiers.has(nodeId)) {
      return tiers.get(nodeId)!;
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      return 1;
    }

    // If node has explicit tier, use it
    if (node.tier !== undefined) {
      tiers.set(nodeId, node.tier);
      return node.tier;
    }

    // Detect cycles
    if (visiting.has(nodeId)) {
      console.warn(`Cycle detected involving node: ${nodeId}`);
      return 1;
    }

    visiting.add(nodeId);

    // No prerequisites = tier 1
    if (node.prerequisites.length === 0) {
      tiers.set(nodeId, 1);
      visiting.delete(nodeId);
      return 1;
    }

    // Tier = 1 + max prereq tier
    let maxPrereqTier = 0;
    for (const prereqId of node.prerequisites) {
      const prereqTier = getTier(prereqId);
      maxPrereqTier = Math.max(maxPrereqTier, prereqTier);
    }

    const tier = maxPrereqTier + 1;
    tiers.set(nodeId, tier);
    visiting.delete(nodeId);
    return tier;
  }

  // Calculate tier for all nodes
  for (const node of nodes) {
    getTier(node.id);
  }

  return tiers;
}

/**
 * Get the next recommended development targets
 * Returns nodes that are planned/blocked and have all prerequisites completed
 */
export function getNextTargets(tree: ComputedTechTree): ComputedTechNode[] {
  const completedIds = new Set(
    tree.nodes.filter((n) => n.status === "completed").map((n) => n.id)
  );

  return tree.nodes.filter((node) => {
    // Skip already completed or in-progress nodes
    if (node.status === "completed" || node.status === "in-progress") {
      return false;
    }

    // All prerequisites must be completed
    return node.prerequisites.every((prereq) => completedIds.has(prereq));
  });
}

/**
 * Check if a node can be started (all prerequisites are completed)
 */
export function canStartNode(
  nodeId: string,
  tree: ComputedTechTree
): boolean {
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return false;

  const completedIds = new Set(
    tree.nodes.filter((n) => n.status === "completed").map((n) => n.id)
  );

  return node.prerequisites.every((prereq) => completedIds.has(prereq));
}

/**
 * Get all ancestors (transitive prerequisites) of a node
 */
export function getAncestors(
  nodeId: string,
  tree: ComputedTechTree
): Set<string> {
  const ancestors = new Set<string>();
  const nodeMap = new Map(tree.nodes.map((n) => [n.id, n]));

  function traverse(id: string) {
    const node = nodeMap.get(id);
    if (!node) return;

    for (const prereq of node.prerequisites) {
      if (!ancestors.has(prereq)) {
        ancestors.add(prereq);
        traverse(prereq);
      }
    }
  }

  traverse(nodeId);
  return ancestors;
}

/**
 * Get all descendants (nodes that depend on this node, transitively)
 */
export function getDescendants(
  nodeId: string,
  tree: ComputedTechTree
): Set<string> {
  const descendants = new Set<string>();
  const nodeMap = new Map(tree.nodes.map((n) => [n.id, n]));

  function traverse(id: string) {
    const node = nodeMap.get(id);
    if (!node) return;

    for (const dep of node.dependents) {
      if (!descendants.has(dep)) {
        descendants.add(dep);
        traverse(dep);
      }
    }
  }

  traverse(nodeId);
  return descendants;
}
