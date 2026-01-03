# Tech Tree API for Agents

Base URL: `http://localhost:3001`

## Multi-Tree Endpoints

### GET /api/trees

List all available tree names.

```bash
curl http://localhost:3001/api/trees
```

Response:
```json
{
  "trees": ["system", "pdf-parser", "other-tree"]
}
```

### POST /api/subtrees

Create a new subtree and link it to the system tree.

```bash
curl -X POST http://localhost:3001/api/subtrees \
  -H "Content-Type: application/json" \
  -d '{
    "yaml": "name: My Feature\nversion: 1.0.0\nnodes:\n  - id: step-1\n    name: First Step\n    status: planned"
  }'
```

**Parameters:**
- `yaml` (required): Raw YAML content for the subtree
- `attachTo` (optional): ID of an existing system node to attach the subtree to

**Behavior:**
- Creates a new tree file named after the slugified tree name (e.g., "My Feature" → `my-feature.yaml`)
- If `attachTo` is provided: updates that existing node's `subtree` field
- If `attachTo` is omitted: creates a new node on the system tree linking to the subtree

**Examples:**

Create subtree with new system node:
```bash
curl -X POST http://localhost:3001/api/subtrees \
  -H "Content-Type: application/json" \
  -d '{"yaml": "name: Auth System\nversion: 1.0.0\nnodes:\n  - id: login\n    name: Login Flow\n    status: planned"}'
```

Attach subtree to existing node:
```bash
curl -X POST http://localhost:3001/api/subtrees \
  -H "Content-Type: application/json" \
  -d '{"yaml": "name: PDF Details\nversion: 1.0.0\nnodes:\n  - id: ocr\n    name: OCR\n    status: planned", "attachTo": "pdf-parsing"}'
```

Response:
```json
{
  "subtree": { ... },
  "systemNode": { ... },
  "message": "Subtree created with new system node 'auth-system'"
}
```

### GET /api/trees/:name

Fetch a specific tree.

```bash
curl http://localhost:3001/api/trees/system
```

Response:
```json
{
  "name": "System Name",
  "version": "1.0.0",
  "nodes": [
    {
      "id": "capability-id",
      "name": "Capability Name",
      "status": "completed",
      "prerequisites": [],
      "dependents": ["other-id"],
      "computedTier": 1,
      "devPoints": 5,
      "subtree": "subtree-name"
    }
  ],
  "tiers": { "1": [...], "2": [...] },
  "totalDevPoints": 25,
  "completedDevPoints": 12
}
```

### PUT /api/trees/:name

Replace an entire tree.

```bash
curl -X PUT http://localhost:3001/api/trees/system \
  -H "Content-Type: application/json" \
  -d '{"name": "New Tree", "nodes": [...]}'
```

### PATCH /api/trees/:name/nodes/:id

Update a node's properties in a specific tree.

```bash
curl -X PATCH http://localhost:3001/api/trees/system/nodes/capability-id \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

Valid status values: `planned`, `in-progress`, `completed`, `blocked`

Other updatable fields: `name`, `description`, `devPoints`, `blockedReason`, `tags`, `repo`, `subtree`

## Legacy Endpoints (default to "system" tree)

### GET /api/tree

Fetch the default tree (system).

```bash
curl http://localhost:3001/api/tree
```

### PATCH /api/nodes/:id

Update a node in the default tree.

```bash
curl -X PATCH http://localhost:3001/api/nodes/capability-id \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### PUT /api/tree

Replace the default tree.

```bash
curl -X PUT http://localhost:3001/api/tree \
  -H "Content-Type: application/json" \
  -d '{"name": "New Tree", "nodes": [...]}'
```

## Common Agent Workflows

### Mark capability as complete
```bash
curl -X PATCH http://localhost:3001/api/trees/system/nodes/my-capability \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### Start working on a capability
```bash
curl -X PATCH http://localhost:3001/api/trees/system/nodes/my-capability \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

### Block a capability with reason
```bash
curl -X PATCH http://localhost:3001/api/trees/system/nodes/my-capability \
  -H "Content-Type: application/json" \
  -d '{"status": "blocked", "blockedReason": "Waiting on dependency X"}'
```

### Check what's ready to work on
Fetch tree and filter for nodes where:
- `status` is `planned`
- All `prerequisites` have `status: completed`

```javascript
const tree = await fetch('http://localhost:3001/api/trees/system').then(r => r.json());
const completedIds = new Set(tree.nodes.filter(n => n.status === 'completed').map(n => n.id));
const ready = tree.nodes.filter(n =>
  n.status === 'planned' &&
  n.prerequisites.every(p => completedIds.has(p))
);
```

### List all available trees
```bash
curl http://localhost:3001/api/trees
```

### Navigate to a subtree
If a node has a `subtree` field, fetch that tree:
```bash
# If node has subtree: "pdf-parser"
curl http://localhost:3001/api/trees/pdf-parser
```

## Error Responses

```json
{ "error": "Node not found: invalid-id" }
{ "error": "Tree not found: invalid-tree" }
{ "error": "Invalid tree format" }
```

HTTP status codes: 200 (success), 400 (bad request), 404 (not found), 500 (server error)
