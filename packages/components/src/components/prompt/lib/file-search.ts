/**
 * File search utility for autocomplete
 * Uses fast-glob for efficient file discovery
 */

import fg from "fast-glob";

const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/*.lock",
  "**/package-lock.json",
  "**/bun.lockb",
  "**/.DS_Store",
  "**/thumbs.db",
];

// Regex for parsing line ranges at top level for performance
const LINE_RANGE_REGEX = /^(\d+)(?:-(\d*))?$/;

/**
 * Extract line range from file path query
 * e.g., "file.ts#10-20" -> { baseName: "file.ts", startLine: 10, endLine: 20 }
 */
export function extractLineRange(input: string): {
  baseQuery: string;
  lineRange?: {
    baseName: string;
    startLine: number;
    endLine?: number;
  };
} {
  const hashIndex = input.lastIndexOf("#");
  if (hashIndex === -1) {
    return { baseQuery: input };
  }

  const baseName = input.substring(0, hashIndex);
  const linePart = input.substring(hashIndex + 1);
  const lineMatch = linePart.match(LINE_RANGE_REGEX);

  if (!lineMatch) {
    return { baseQuery: baseName };
  }

  const startLine = Number(lineMatch[1]);
  const endLine =
    lineMatch[2] && startLine < Number(lineMatch[2])
      ? Number(lineMatch[2])
      : undefined;

  return {
    baseQuery: baseName,
    lineRange: {
      baseName,
      startLine,
      endLine,
    },
  };
}

/**
 * Remove line range from query for matching
 */
export function removeLineRange(input: string): string {
  const hashIndex = input.lastIndexOf("#");
  return hashIndex !== -1 ? input.substring(0, hashIndex) : input;
}

/**
 * Search for files matching a query
 * @param query The search query (partial path or filename)
 * @param cwd The directory to search in
 * @param limit Maximum number of results
 */
export async function searchFiles(
  query: string,
  cwd: string = process.cwd(),
  limit = 100
): Promise<string[]> {
  // Build the glob pattern from the query
  // If query is empty, return all files
  // If query contains path separator, use it as prefix
  // Otherwise, search for files containing the query

  const cleanQuery = removeLineRange(query).trim();

  let pattern: string;
  if (!cleanQuery) {
    // Empty query - return top-level files and directories
    pattern = "*";
  } else if (cleanQuery.includes("/")) {
    // Query contains path - search within that path
    if (cleanQuery.endsWith("/")) {
      // Directory listing
      pattern = `${cleanQuery}*`;
    } else {
      // Partial path match
      pattern = `${cleanQuery}*`;
    }
  } else {
    // Simple query - search anywhere in the tree
    pattern = `**/*${cleanQuery}*`;
  }

  try {
    const files = await fg(pattern, {
      cwd,
      ignore: IGNORE_PATTERNS,
      onlyFiles: false,
      markDirectories: true,
      dot: false,
      absolute: false,
      suppressErrors: true,
      caseSensitiveMatch: false,
    });

    // Sort: directories first (for expansion), then by path depth, then alphabetically
    const sorted = files.sort((a, b) => {
      const aIsDir = a.endsWith("/");
      const bIsDir = b.endsWith("/");

      // Directories first
      if (aIsDir !== bIsDir) {
        return aIsDir ? -1 : 1;
      }

      // Then by depth (shallow first)
      const aDepth = a.split("/").length;
      const bDepth = b.split("/").length;
      if (aDepth !== bDepth) {
        return aDepth - bDepth;
      }

      // Then alphabetically
      return a.localeCompare(b);
    });

    return sorted.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Build a file URL with optional line range
 */
export function buildFileUrl(
  filePath: string,
  cwd: string,
  lineRange?: { startLine: number; endLine?: number }
): string {
  let url = `file://${cwd}/${filePath}`;

  if (lineRange) {
    const urlObj = new URL(url);
    urlObj.searchParams.set("start", String(lineRange.startLine));
    if (lineRange.endLine !== undefined) {
      urlObj.searchParams.set("end", String(lineRange.endLine));
    }
    url = urlObj.toString();
  }

  return url;
}

/**
 * Truncate a string from the middle to fit a max width
 */
export function truncateMiddle(str: string, maxWidth: number): string {
  if (str.length <= maxWidth) {
    return str;
  }
  const ellipsis = "...";
  const sideLength = Math.floor((maxWidth - ellipsis.length) / 2);
  return (
    str.substring(0, sideLength) +
    ellipsis +
    str.substring(str.length - sideLength)
  );
}
