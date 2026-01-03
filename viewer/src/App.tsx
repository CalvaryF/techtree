import { useState, useCallback, useEffect } from "react";
import { TechTree, type ComputedTechNode, type ComputedTechTree } from "@techtree/renderer";

const API_BASE = "http://localhost:3001/api";

async function fetchTrees(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/trees`);
  if (!res.ok) throw new Error("Failed to fetch trees");
  const data = await res.json();
  return data.trees;
}

async function fetchTree(name: string): Promise<ComputedTechTree> {
  const res = await fetch(`${API_BASE}/trees/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch tree: ${name}`);
  const data = await res.json();
  // Convert tiers object back to Map
  data.tiers = new Map(Object.entries(data.tiers).map(([k, v]) => [Number(k), v]));
  return data;
}

async function updateNodeStatus(
  treeName: string,
  nodeId: string,
  status: string
): Promise<ComputedTechTree> {
  const res = await fetch(`${API_BASE}/trees/${treeName}/nodes/${nodeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update node");
  const data = await res.json();
  data.tiers = new Map(Object.entries(data.tiers).map(([k, v]) => [Number(k), v]));
  return data;
}

export function App() {
  const [availableTrees, setAvailableTrees] = useState<string[]>([]);
  const [treePath, setTreePath] = useState<string[]>(["system"]);
  const [tree, setTree] = useState<ComputedTechTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const currentTreeName = treePath[treePath.length - 1];

  const loadTrees = useCallback(async () => {
    try {
      const trees = await fetchTrees();
      setAvailableTrees(trees);
    } catch (err) {
      console.error("Failed to load tree list:", err);
    }
  }, []);

  const loadTree = useCallback(async (name: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTree(name);
      setTree(data);
      setSelectedNodeId(null);
      setShowDetails(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tree");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrees();
  }, [loadTrees]);

  useEffect(() => {
    loadTree(currentTreeName);
  }, [currentTreeName, loadTree]);

  const handleNodeClick = useCallback(
    (node: ComputedTechNode) => {
      setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
      setShowDetails(true);
    },
    [selectedNodeId]
  );

  const handleNodeDoubleClick = useCallback(
    (node: ComputedTechNode) => {
      if (node.subtree && availableTrees.includes(node.subtree)) {
        setTreePath((prev) => [...prev, node.subtree!]);
      }
    },
    [availableTrees]
  );

  const handleStatusChange = useCallback(
    async (nodeId: string, status: string) => {
      try {
        const updated = await updateNodeStatus(currentTreeName, nodeId, status);
        setTree(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
      }
    },
    [currentTreeName]
  );

  const navigateToSubtree = useCallback((subtreeName: string) => {
    setTreePath((prev) => [...prev, subtreeName]);
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    setTreePath((prev) => prev.slice(0, index + 1));
  }, []);

  const selectedNode = tree?.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="h-full flex flex-col bg-white text-neutral-900">
      {/* Toolbar */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center gap-3 border-b border-neutral-200">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-1 text-sm">
          {treePath.map((name, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <span className="mx-1 text-neutral-300">/</span>}
              {index === treePath.length - 1 ? (
                <span className="font-medium text-neutral-900">{name}</span>
              ) : (
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className="text-neutral-500 hover:text-neutral-900 hover:underline"
                >
                  {name}
                </button>
              )}
            </span>
          ))}
        </nav>

        <div className="flex-1" />

        <button
          onClick={() => {
            loadTrees();
            loadTree(currentTreeName);
          }}
          className="px-3 py-1.5 text-sm border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
        >
          Refresh
        </button>

        {selectedNode && (
          <button
            onClick={() => {
              setSelectedNodeId(null);
              setShowDetails(false);
            }}
            className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex-shrink-0 p-4 bg-red-50 border-b border-red-200">
          <div className="font-medium text-red-700">{error}</div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree view */}
        <div className="flex-1 overflow-hidden">
          {tree && (
            <TechTree
              tree={tree}
              selectedNodeId={selectedNodeId}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onBackgroundClick={() => {
                setSelectedNodeId(null);
                setShowDetails(false);
              }}
            />
          )}

          {loading && (
            <div className="h-full flex items-center justify-center text-neutral-400">
              Loading...
            </div>
          )}

          {!loading && !tree && !error && (
            <div className="h-full flex items-center justify-center text-neutral-400">
              No tree loaded
            </div>
          )}
        </div>

        {/* Details panel */}
        {showDetails && selectedNode && (
          <div className="w-72 flex-shrink-0 border-l border-neutral-200 bg-white overflow-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-neutral-900">Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Name</div>
                  <div className="text-neutral-900">{selectedNode.name}</div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">ID</div>
                  <div className="font-mono text-neutral-600">{selectedNode.id}</div>
                </div>

                {selectedNode.description && (
                  <div>
                    <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Description</div>
                    <div className="text-neutral-600">{selectedNode.description}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Status</div>
                  <select
                    value={selectedNode.status}
                    onChange={(e) => handleStatusChange(selectedNode.id, e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-200 rounded-md"
                  >
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Tier</div>
                  <div className="text-neutral-900">{selectedNode.computedTier}</div>
                </div>

                {selectedNode.devPoints !== undefined && (
                  <div>
                    <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Dev Points</div>
                    <div className="text-neutral-900">{selectedNode.devPoints}</div>
                  </div>
                )}

                {selectedNode.prerequisites.length > 0 && (
                  <div>
                    <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Prerequisites</div>
                    <div className="text-neutral-600 font-mono text-xs">
                      {selectedNode.prerequisites.join(", ")}
                    </div>
                  </div>
                )}

                {selectedNode.dependents.length > 0 && (
                  <div>
                    <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Dependents</div>
                    <div className="text-neutral-600 font-mono text-xs">
                      {selectedNode.dependents.join(", ")}
                    </div>
                  </div>
                )}

                {selectedNode.repo && (
                  <div>
                    <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Repository</div>
                    <a
                      href={selectedNode.repo.startsWith("http") ? selectedNode.repo : `https://${selectedNode.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      {selectedNode.repo}
                    </a>
                  </div>
                )}

                {/* Subtree navigation */}
                {selectedNode.subtree && (
                  <div>
                    <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Subtree</div>
                    <button
                      onClick={() => navigateToSubtree(selectedNode.subtree!)}
                      disabled={!availableTrees.includes(selectedNode.subtree)}
                      className="w-full mt-1 px-3 py-2 text-sm bg-neutral-100 hover:bg-neutral-200 rounded-md flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-mono">{selectedNode.subtree}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {!availableTrees.includes(selectedNode.subtree) && (
                      <p className="mt-1 text-xs text-neutral-400">Subtree not found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
