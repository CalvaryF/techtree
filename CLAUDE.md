# Tech Tree

A Factorio-inspired capability development visualization system. Designed as a state machine and planner for an agent/tool digital factory.

## What This Is

Tech trees represent **capability development** - what capabilities exist, their development status, and which must be developed before others. This is NOT a data flow graph; it's a planning and tracking tool for coordinating development across multiple repos/tools in an LLM-based system.

## Architecture

```
techtree/
├── packages/
│   ├── core/           # Schema, parser, graph utilities
│   ├── renderer/       # React + React Flow visualization
│   └── server/         # Express API server
├── viewer/             # Vite + React viewer app
├── trees/              # YAML tech tree definitions
│   ├── system.yaml     # Main system tree
│   └── pdf-parser.yaml # Example subtree
└── package.json        # npm workspaces root
```

### Package: @techtree/core

TypeScript library for tech tree data structures.

**Key files:**
- `src/schema.ts` - Zod schemas and TypeScript types
- `src/parser.ts` - YAML parsing with validation
- `src/graph.ts` - Tier calculation, dependency traversal

**Main types:**
- `TechTree` - Raw tree spec (name, nodes array)
- `TechNode` - Individual capability (id, name, status, prerequisites, devPoints, subtree)
- `ComputedTechTree` - Tree with computed properties (tiers Map, totals)
- `NodeStatus` - "completed" | "in-progress" | "planned" | "blocked"

### Package: @techtree/renderer

React components using React Flow for visualization.

**Key files:**
- `src/components/TechTree.tsx` - Main component, converts nodes to React Flow format
- `src/components/TechNode.tsx` - Custom node component with status styling and subtree indicator

**Styling:** Minimalist, shadcn-inspired. Light mode. Status indicated by colored dot (green=completed, blue=in-progress, gray=planned, orange=blocked). Nodes with subtrees show a grid icon.

### Package: @techtree/server

Express API server that reads/writes YAML files from a directory.

**Key files:**
- `src/index.ts` - Express app, CLI args parsing
- `src/routes.ts` - API route handlers
- `src/store.ts` - MultiTreeStore for directory-based tree management

**Multi-tree Endpoints:**
- `GET /api/trees` - List all available trees
- `GET /api/trees/:name` - Fetch specific tree
- `PUT /api/trees/:name` - Replace specific tree
- `PATCH /api/trees/:name/nodes/:id` - Update node in specific tree

**Legacy Endpoints (default to "system" tree):**
- `GET /api/tree` - Fetch default tree
- `PUT /api/tree` - Replace default tree
- `PATCH /api/nodes/:id` - Update node in default tree

### Viewer App

Vite + React app that connects to the server API.

**Key files:**
- `src/App.tsx` - Main app, API integration, status editing, tree navigation

**Features:**
- Breadcrumb navigation for subtree drilling
- Tree path history (navigate back via breadcrumbs)
- Subtree button in details panel for nodes with `subtree` field

## YAML Spec Format

```yaml
name: "System Name"
version: "1.0.0"
description: "Optional description"

nodes:
  - id: "unique-id"
    name: "Display Name"
    description: "What this capability provides"
    repo: "github.com/user/repo"        # Optional
    status: "planned"                    # completed | in-progress | planned | blocked
    prerequisites: ["other-id"]          # IDs of required capabilities
    devPoints: 5                         # Optional effort score
    tags: ["category"]                   # Optional
    blockedReason: "Why blocked"         # Optional, for blocked status
    subtree: "subtree-name"              # Optional, references another tree file
```

Tiers are auto-calculated: Tier = 1 + max(tier of prerequisites). Nodes with no prerequisites are tier 1.

### Subtrees

Nodes can reference subtrees - separate tree files that provide more detail on a capability. The `subtree` field is the filename without the `.yaml` extension.

Example:
```yaml
# In system.yaml
- id: "pdf-parsing"
  name: "PDF Parsing"
  subtree: "pdf-parser"    # References trees/pdf-parser.yaml
  status: "completed"
```

Subtree status is manual - parent node status is not auto-calculated from subtree nodes.

## Running

```bash
# Install dependencies
npm install

# Start API server (default: trees/ directory on port 3001)
npm run server

# Start viewer dev server (port 3000)
npm run dev

# Build all packages
npm run build
```

Server CLI options:
```bash
npm run server -- --dir ./path/to/trees --port 3002
```

## Implementation Notes

- Uses npm workspaces (not pnpm)
- React Flow handles node positioning and edge routing
- Tiers displayed vertically (tier 1 at top)
- Selection highlights node + ancestors + descendants
- Server reads from/writes to YAML files in trees/ directory
- Each tree file is independent - the `subtree` field is just a reference for navigation
