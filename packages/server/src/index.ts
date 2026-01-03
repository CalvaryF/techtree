import express from "express";
import cors from "cors";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MultiTreeStore } from "./store.js";
import { createRouter } from "./routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_PORT = 3001;
const DEFAULT_DIR = "../../../trees";

function parseArgs(): { port: number; dir: string } {
  const args = process.argv.slice(2);
  let port = DEFAULT_PORT;
  let dir = DEFAULT_DIR;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--dir" && args[i + 1]) {
      dir = args[i + 1];
      i++;
    }
  }

  return { port, dir };
}

async function main() {
  const { port, dir } = parseArgs();
  const dirPath = resolve(__dirname, dir);

  console.log(`Tech Tree Server`);
  console.log(`  Directory: ${dirPath}`);
  console.log(`  Port: ${port}`);

  const store = new MultiTreeStore(dirPath);

  // Verify directory is readable and list available trees
  try {
    const trees = await store.listTrees();
    console.log(`  Trees: ${trees.length} found (${trees.join(", ")})`);

    // Try to load the default tree to verify it exists
    try {
      await store.load("system");
      console.log(`  Status: Ready (default tree: system)`);
    } catch {
      console.log(`  Warning: No 'system.yaml' found - using first available tree`);
    }
  } catch (error) {
    console.error(`  Error: Could not read directory - ${error}`);
    process.exit(1);
  }

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", createRouter(store));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(port, () => {
    console.log(`\nServer running at http://localhost:${port}`);
    console.log(`  GET  /api/trees            - List all trees`);
    console.log(`  GET  /api/trees/:name      - Fetch tree`);
    console.log(`  PUT  /api/trees/:name      - Replace tree`);
    console.log(`  PATCH /api/trees/:name/nodes/:id - Update node`);
    console.log(`\nLegacy endpoints (default to 'system' tree):`);
    console.log(`  GET  /api/tree       - Fetch tree`);
    console.log(`  PUT  /api/tree       - Replace tree`);
    console.log(`  PATCH /api/nodes/:id - Update node`);
  });
}

main().catch(console.error);
