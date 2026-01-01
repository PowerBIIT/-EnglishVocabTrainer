// Gemini model pricing ($ per token)
// See: https://ai.google.dev/pricing
export const GEMINI_PRICING: Record<string, { input: number; output: number }> = {
  // Flash models (fast, cost-effective)
  'gemini-1.5-flash': {
    input: 0.075 / 1_000_000,
    output: 0.30 / 1_000_000,
  },
  'gemini-2.0-flash': {
    input: 0.10 / 1_000_000,
    output: 0.40 / 1_000_000,
  },
  'gemini-2.0-flash-lite': {
    input: 0.075 / 1_000_000,
    output: 0.30 / 1_000_000,
  },
  'gemini-2.5-flash-preview-05-20': {
    input: 0.15 / 1_000_000,
    output: 0.60 / 1_000_000,
  },
  // Pro models (more capable, higher cost)
  'gemini-1.5-pro': {
    input: 1.25 / 1_000_000,
    output: 5.00 / 1_000_000,
  },
  'gemini-2.5-pro-preview-05-06': {
    input: 1.25 / 1_000_000,
    output: 10.00 / 1_000_000,
  },
  // Legacy/experimental
  'gemini-exp-1206': {
    input: 0.075 / 1_000_000,
    output: 0.30 / 1_000_000,
  },
};

const DEFAULT_MODEL = 'gemini-1.5-flash';

// Get pricing for a model, with fallback to default
export function getModelPricing(model: string): { input: number; output: number } {
  // Try exact match first
  if (GEMINI_PRICING[model]) {
    return GEMINI_PRICING[model];
  }

  // Try to match by prefix (e.g., "gemini-2.5-flash-preview" -> "gemini-2.5-flash-preview-05-20")
  const modelPrefix = model.toLowerCase();
  for (const [key, pricing] of Object.entries(GEMINI_PRICING)) {
    if (key.startsWith(modelPrefix) || modelPrefix.startsWith(key.split('-preview')[0])) {
      return pricing;
    }
  }

  // Fallback to default pricing
  return GEMINI_PRICING[DEFAULT_MODEL];
}

// Calculate actual cost from token counts
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = getModelPricing(model);
  const inputCost = Math.max(0, inputTokens) * pricing.input;
  const outputCost = Math.max(0, outputTokens) * pricing.output;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

// Legacy function: estimate cost from "units" (character count approximation)
export function estimateMonthlyCost(units: number): number {
  const safeUnits = Math.max(0, units);
  // Rough approximation: 4 chars ≈ 1 token
  const inputTokens = safeUnits / 4;
  // Assume output is ~50% of input
  const outputTokens = inputTokens * 0.5;
  const pricing = GEMINI_PRICING[DEFAULT_MODEL];
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

// Legacy function: project end-of-month cost from current units
export function projectMonthlyCost(units: number, date: Date = new Date()): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = Math.max(1, date.getUTCDate());
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const projectedUnits = (Math.max(0, units) / day) * daysInMonth;
  return estimateMonthlyCost(projectedUnits);
}

// Calculate actual cost from token counts with projection
export function calculateActualMonthlyCost(
  inputTokens: number,
  outputTokens: number,
  model: string = DEFAULT_MODEL
): number {
  const { totalCost } = calculateTokenCost(model, inputTokens, outputTokens);
  return totalCost;
}

// Project actual token-based cost to end of month
export function projectTokenCost(
  inputTokens: number,
  outputTokens: number,
  model: string = DEFAULT_MODEL,
  date: Date = new Date()
): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = Math.max(1, date.getUTCDate());
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const projectedInput = (Math.max(0, inputTokens) / day) * daysInMonth;
  const projectedOutput = (Math.max(0, outputTokens) / day) * daysInMonth;

  return calculateActualMonthlyCost(projectedInput, projectedOutput, model);
}
