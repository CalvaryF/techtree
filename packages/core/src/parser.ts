import { parse as parseYaml } from "yaml";
import { TechTreeSchema, type TechTree } from "./schema.js";
import { ZodError } from "zod";

/**
 * Result of parsing a tech tree spec
 */
export type ParseResult =
  | { success: true; data: TechTree }
  | { success: false; error: string; details?: string[] };

/**
 * Parse and validate a YAML string as a tech tree specification
 */
export function parseTechTree(yamlContent: string): ParseResult {
  try {
    // Parse YAML
    const rawData = parseYaml(yamlContent);

    if (!rawData || typeof rawData !== "object") {
      return {
        success: false,
        error: "Invalid YAML: expected an object",
      };
    }

    // Validate against schema
    const result = TechTreeSchema.safeParse(rawData);

    if (!result.success) {
      return {
        success: false,
        error: "Schema validation failed",
        details: formatZodErrors(result.error),
      };
    }

    // Validate prerequisites reference valid node IDs
    const nodeIds = new Set(result.data.nodes.map((n) => n.id));
    const invalidPrereqs: string[] = [];

    for (const node of result.data.nodes) {
      for (const prereq of node.prerequisites) {
        if (!nodeIds.has(prereq)) {
          invalidPrereqs.push(
            `Node "${node.id}" has invalid prerequisite "${prereq}"`
          );
        }
      }
    }

    if (invalidPrereqs.length > 0) {
      return {
        success: false,
        error: "Invalid prerequisites",
        details: invalidPrereqs,
      };
    }

    // Check for duplicate IDs
    const duplicates = findDuplicates(result.data.nodes.map((n) => n.id));
    if (duplicates.length > 0) {
      return {
        success: false,
        error: "Duplicate node IDs",
        details: duplicates.map((id) => `Duplicate ID: "${id}"`),
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    if (err instanceof Error) {
      return {
        success: false,
        error: `YAML parse error: ${err.message}`,
      };
    }
    return {
      success: false,
      error: "Unknown parse error",
    };
  }
}

/**
 * Format Zod validation errors into human-readable strings
 */
function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path}: ${issue.message}`;
  });
}

/**
 * Find duplicate values in an array
 */
function findDuplicates<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();

  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    }
    seen.add(item);
  }

  return Array.from(duplicates);
}
