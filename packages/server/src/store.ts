import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { stringify } from "yaml";
import {
  parseTechTree,
  computeTechTree,
  type TechTree,
  type ComputedTechTree,
  type TechNode,
} from "@techtree/core";

export class MultiTreeStore {
  constructor(private dirPath: string) {}

  /**
   * List all available tree names (without .yaml extension)
   */
  async listTrees(): Promise<string[]> {
    const files = await readdir(this.dirPath);
    return files
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .map((f) => f.replace(/\.ya?ml$/, ""))
      .sort();
  }

  /**
   * Get the file path for a tree name
   */
  private getFilePath(name: string): string {
    return join(this.dirPath, `${name}.yaml`);
  }

  /**
   * Load a tree by name and return computed version
   */
  async load(name: string): Promise<ComputedTechTree> {
    const filePath = this.getFilePath(name);
    const content = await readFile(filePath, "utf-8");
    const result = parseTechTree(content);

    if (!result.success) {
      throw new Error(`Failed to parse tree '${name}': ${result.error}`);
    }

    return computeTechTree(result.data);
  }

  /**
   * Load a tree by name and return raw version
   */
  async loadRaw(name: string): Promise<TechTree> {
    const filePath = this.getFilePath(name);
    const content = await readFile(filePath, "utf-8");
    const result = parseTechTree(content);

    if (!result.success) {
      throw new Error(`Failed to parse tree '${name}': ${result.error}`);
    }

    return result.data;
  }

  /**
   * Save a tree by name
   */
  async save(name: string, tree: TechTree): Promise<void> {
    // Validate before saving
    const result = parseTechTree(stringify(tree));
    if (!result.success) {
      throw new Error(`Invalid tree data: ${result.error}`);
    }

    const yaml = stringify(tree, { indent: 2 });
    await writeFile(this.getFilePath(name), yaml, "utf-8");
  }

  /**
   * Update a node in a specific tree
   */
  async updateNode(
    treeName: string,
    nodeId: string,
    updates: Partial<Omit<TechNode, "id">>
  ): Promise<ComputedTechTree> {
    const tree = await this.loadRaw(treeName);

    const nodeIndex = tree.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // Apply updates
    tree.nodes[nodeIndex] = {
      ...tree.nodes[nodeIndex],
      ...updates,
    };

    await this.save(treeName, tree);
    return computeTechTree(tree);
  }

  /**
   * Check if a tree exists
   */
  async exists(name: string): Promise<boolean> {
    try {
      await readFile(this.getFilePath(name), "utf-8");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add a node to a specific tree
   */
  async addNode(
    treeName: string,
    node: TechNode
  ): Promise<ComputedTechTree> {
    const tree = await this.loadRaw(treeName);

    // Check if node with this ID already exists
    if (tree.nodes.some((n) => n.id === node.id)) {
      throw new Error(`Node already exists: ${node.id}`);
    }

    tree.nodes.push(node);
    await this.save(treeName, tree);
    return computeTechTree(tree);
  }

  /**
   * Create a new tree from raw YAML content
   */
  async createFromYaml(name: string, yamlContent: string): Promise<ComputedTechTree> {
    // Check if tree already exists
    if (await this.exists(name)) {
      throw new Error(`Tree already exists: ${name}`);
    }

    // Validate the YAML
    const result = parseTechTree(yamlContent);
    if (!result.success) {
      throw new Error(`Invalid YAML: ${result.error}`);
    }

    // Save the tree
    await writeFile(this.getFilePath(name), yamlContent, "utf-8");
    return computeTechTree(result.data);
  }
}

// Keep backward compatibility - TreeStore wraps MultiTreeStore for a single file
export class TreeStore {
  private multiStore: MultiTreeStore;
  private treeName: string;

  constructor(filePath: string) {
    // Extract directory and filename
    const parts = filePath.split("/");
    const filename = parts.pop()!;
    const dirPath = parts.join("/") || ".";
    this.treeName = filename.replace(/\.ya?ml$/, "");
    this.multiStore = new MultiTreeStore(dirPath);
  }

  async load(): Promise<ComputedTechTree> {
    return this.multiStore.load(this.treeName);
  }

  async loadRaw(): Promise<TechTree> {
    return this.multiStore.loadRaw(this.treeName);
  }

  async save(tree: TechTree): Promise<void> {
    return this.multiStore.save(this.treeName, tree);
  }

  async updateNode(
    nodeId: string,
    updates: Partial<Omit<TechNode, "id">>
  ): Promise<ComputedTechTree> {
    return this.multiStore.updateNode(this.treeName, nodeId, updates);
  }
}
