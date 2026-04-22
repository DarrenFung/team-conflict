import "server-only";

// Gemini token usage shape from providerMetadata. Exposed under `vertex` for
// the Vertex provider and under `google` for the direct Google provider —
// different key, same payload.
type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
};

function readUsage(metadata: unknown): GeminiUsageMetadata | null {
  if (metadata == null || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const bucket =
    (m.vertex as Record<string, unknown> | undefined) ??
    (m.google as Record<string, unknown> | undefined);
  const usage = bucket?.usageMetadata as GeminiUsageMetadata | undefined;
  return usage ?? null;
}

// Log Gemini token usage, including implicit-cache hits. Tail these logs to
// confirm cachedContentTokenCount is non-zero on repeated turns — if it
// stays 0, the system prompt / tool defs have drifted and lost the cache.
export function logCachedUsage(tag: string, metadata: unknown): void {
  const usage = readUsage(metadata);
  if (!usage) return;
  console.log(
    `[${tag}] tokens — cached: ${usage.cachedContentTokenCount ?? 0} / prompt: ${usage.promptTokenCount ?? 0} / output: ${usage.candidatesTokenCount ?? 0} / thoughts: ${usage.thoughtsTokenCount ?? 0}`,
  );
}
