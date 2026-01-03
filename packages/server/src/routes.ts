import { Router, type Request, type Response } from "express";
import type { MultiTreeStore } from "./store.js";
import { parseTechTree } from "@techtree/core";

const DEFAULT_TREE = "system";

function serializeTree(tree: { tiers: Map<number, unknown[]> }) {
  return {
    ...tree,
    tiers: Object.fromEntries(tree.tiers),
  };
}

/**
 * Convert a name to a URL-safe slug
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createRouter(store: MultiTreeStore): Router {
  const router = Router();

  // GET /api/trees - List all available trees
  router.get("/trees", async (_req: Request, res: Response) => {
    try {
      const trees = await store.listTrees();
      res.json({ trees });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // POST /api/subtrees - Create a new subtree and link it to the system tree
  router.post("/subtrees", async (req: Request, res: Response) => {
    try {
      const { yaml, attachTo } = req.body;

      if (!yaml || typeof yaml !== "string") {
        res.status(400).json({ error: "Missing or invalid 'yaml' field" });
        return;
      }

      // Parse the YAML to get the tree name
      const parseResult = parseTechTree(yaml);
      if (!parseResult.success) {
        res.status(400).json({ error: `Invalid YAML: ${parseResult.error}` });
        return;
      }

      const subtreeName = slugify(parseResult.data.name);

      // Check if subtree already exists
      if (await store.exists(subtreeName)) {
        res.status(409).json({ error: `Subtree already exists: ${subtreeName}` });
        return;
      }

      // Create the subtree
      const subtree = await store.createFromYaml(subtreeName, yaml);

      let systemNode;

      if (attachTo) {
        // Attach to existing node
        const systemTree = await store.updateNode(DEFAULT_TREE, attachTo, {
          subtree: subtreeName,
        });
        systemNode = systemTree.nodes.find((n) => n.id === attachTo);
      } else {
        // Create a new node on the system tree
        const newNodeId = subtreeName;
        const newNode = {
          id: newNodeId,
          name: parseResult.data.name,
          description: parseResult.data.description,
          status: "planned" as const,
          prerequisites: [] as string[],
          subtree: subtreeName,
          tags: [] as string[],
        };

        const systemTree = await store.addNode(DEFAULT_TREE, newNode);
        systemNode = systemTree.nodes.find((n) => n.id === newNodeId);
      }

      res.status(201).json({
        subtree: serializeTree(subtree),
        systemNode,
        message: attachTo
          ? `Subtree created and attached to node '${attachTo}'`
          : `Subtree created with new system node '${subtreeName}'`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else if (message.includes("already exists")) {
        res.status(409).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  });

  // GET /api/trees/:name - Fetch a specific tree
  router.get("/trees/:name", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const tree = await store.load(name);
      res.json(serializeTree(tree));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("ENOENT")) {
        res.status(404).json({ error: `Tree not found: ${req.params.name}` });
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  // PUT /api/trees/:name - Replace a specific tree
  router.put("/trees/:name", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const tree = req.body;

      if (!tree || !tree.name || !Array.isArray(tree.nodes)) {
        res.status(400).json({ error: "Invalid tree format" });
        return;
      }

      await store.save(name, tree);
      const updated = await store.load(name);
      res.json(serializeTree(updated));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  // PATCH /api/trees/:name/nodes/:id - Update a node in a specific tree
  router.patch("/trees/:name/nodes/:id", async (req: Request, res: Response) => {
    try {
      const { name, id } = req.params;
      const updates = req.body;

      if (!updates || typeof updates !== "object") {
        res.status(400).json({ error: "Invalid update format" });
        return;
      }

      // Don't allow changing the node ID
      delete updates.id;

      const updated = await store.updateNode(name, id, updates);
      res.json(serializeTree(updated));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else if (message.includes("ENOENT")) {
        res.status(404).json({ error: `Tree not found: ${req.params.name}` });
      } else {
        res.status(400).json({ error: message });
      }
    }
  });

  // Backward-compatible routes (alias to default tree)

  // GET /api/tree - Fetch the default tree
  router.get("/tree", async (_req: Request, res: Response) => {
    try {
      const tree = await store.load(DEFAULT_TREE);
      res.json(serializeTree(tree));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // PUT /api/tree - Replace the default tree
  router.put("/tree", async (req: Request, res: Response) => {
    try {
      const tree = req.body;

      if (!tree || !tree.name || !Array.isArray(tree.nodes)) {
        res.status(400).json({ error: "Invalid tree format" });
        return;
      }

      await store.save(DEFAULT_TREE, tree);
      const updated = await store.load(DEFAULT_TREE);
      res.json(serializeTree(updated));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  // PATCH /api/nodes/:id - Update a node in the default tree
  router.patch("/nodes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!updates || typeof updates !== "object") {
        res.status(400).json({ error: "Invalid update format" });
        return;
      }

      // Don't allow changing the node ID
      delete updates.id;

      const updated = await store.updateNode(DEFAULT_TREE, id, updates);
      res.json(serializeTree(updated));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  });

  return router;
}
