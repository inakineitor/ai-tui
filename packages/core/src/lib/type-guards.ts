/**
 * Type representing a finish part with usage information.
 * Used for extracting token usage from AI SDK message parts.
 */
export type FinishPartWithUsage = {
  type: "finish";
  totalUsage: {
    inputTokens: number;
    outputTokens: number;
  };
};

/**
 * Type guard to check if a part is a finish part with usage information.
 * Safely validates the structure without unsafe type assertions.
 */
export function isFinishPartWithUsage(
  part: unknown
): part is FinishPartWithUsage {
  if (typeof part !== "object" || part === null) {
    return false;
  }

  const p = part as Record<string, unknown>;

  if (p.type !== "finish") {
    return false;
  }

  if (typeof p.totalUsage !== "object" || p.totalUsage === null) {
    return false;
  }

  const usage = p.totalUsage as Record<string, unknown>;

  return (
    typeof usage.inputTokens === "number" &&
    typeof usage.outputTokens === "number"
  );
}
