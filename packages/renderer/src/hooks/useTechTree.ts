import { useState, useCallback, useMemo } from "react";
import {
  parseTechTree,
  computeTechTree,
  getNextTargets,
  type ComputedTechTree,
  type ComputedTechNode,
  type ParseResult,
} from "@techtree/core";

export interface UseTechTreeResult {
  /** The computed tech tree, or null if not loaded */
  tree: ComputedTechTree | null;

  /** Parse error, if any */
  error: string | null;

  /** Detailed error messages */
  errorDetails: string[] | null;

  /** Currently selected node ID */
  selectedNodeId: string | null;

  /** Nodes that are ready to be started (all prerequisites complete) */
  nextTargets: ComputedTechNode[];

  /** Load a tech tree from YAML content */
  loadFromYaml: (yaml: string) => void;

  /** Select a node by ID (or null to deselect) */
  selectNode: (nodeId: string | null) => void;

  /** Get a node by ID */
  getNode: (nodeId: string) => ComputedTechNode | undefined;

  /** Check if tree is loaded */
  isLoaded: boolean;
}

export function useTechTree(): UseTechTreeResult {
  const [tree, setTree] = useState<ComputedTechTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[] | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const loadFromYaml = useCallback((yaml: string) => {
    const result: ParseResult = parseTechTree(yaml);

    if (!result.success) {
      setError(result.error);
      setErrorDetails(result.details ?? null);
      setTree(null);
      setSelectedNodeId(null);
      return;
    }

    const computed = computeTechTree(result.data);
    setTree(computed);
    setError(null);
    setErrorDetails(null);
    setSelectedNodeId(null);
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const getNode = useCallback(
    (nodeId: string): ComputedTechNode | undefined => {
      return tree?.nodes.find((n) => n.id === nodeId);
    },
    [tree]
  );

  const nextTargets = useMemo(() => {
    if (!tree) return [];
    return getNextTargets(tree);
  }, [tree]);

  return {
    tree,
    error,
    errorDetails,
    selectedNodeId,
    nextTargets,
    loadFromYaml,
    selectNode,
    getNode,
    isLoaded: tree !== null,
  };
}
