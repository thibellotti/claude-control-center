/**
 * Shared model pricing and cost estimation utilities.
 *
 * Used by both session-intel and project-intel to ensure consistent
 * cost calculations across the application.
 */

// USD per million tokens
export interface ModelPricing {
  input: number;
  output: number;
}

/**
 * Default pricing table keyed by model family substring.
 * Checked in order — first match wins.
 */
const MODEL_PRICING: Array<{ pattern: string; pricing: ModelPricing }> = [
  // Claude
  { pattern: 'opus', pricing: { input: 15, output: 75 } },
  { pattern: 'haiku', pricing: { input: 0.25, output: 1.25 } },
  { pattern: 'sonnet', pricing: { input: 3, output: 15 } },
  // OpenAI / Codex
  { pattern: 'o4-mini', pricing: { input: 1.1, output: 4.4 } },
  { pattern: 'o3', pricing: { input: 2, output: 8 } },
  { pattern: 'gpt-4.1', pricing: { input: 2, output: 8 } },
  // Gemini
  { pattern: 'gemini-2.5-pro', pricing: { input: 1.25, output: 10 } },
  { pattern: 'gemini-2.5-flash', pricing: { input: 0.15, output: 0.6 } },
];

const DEFAULT_PRICING: ModelPricing = { input: 3, output: 15 };

/**
 * Look up pricing for a model string (e.g. "claude-sonnet-4-6", "o4-mini").
 */
export function getPricing(model: string): ModelPricing {
  const lower = model.toLowerCase();
  for (const entry of MODEL_PRICING) {
    if (lower.includes(entry.pattern)) return entry.pricing;
  }
  return DEFAULT_PRICING;
}

/**
 * Estimate cost in USD from token counts and model string.
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = getPricing(model);
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}
