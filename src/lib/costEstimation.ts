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
  // Gemini 2.5 Flash family
  'gemini-2.5-flash': {
    input: 0.15 / 1_000_000,
    output: 0.60 / 1_000_000,
  },
  'gemini-2.5-flash-lite': {
    input: 0.075 / 1_000_000,
    output: 0.30 / 1_000_000,
  },
  'gemini-2.5-flash-preview-05-20': {
    input: 0.15 / 1_000_000,
    output: 0.60 / 1_000_000,
  },
  // Gemini 3 Flash (preview)
  'gemini-3-flash-preview': {
    input: 0.15 / 1_000_000,
    output: 0.60 / 1_000_000,
  },
  // Pro models (more capable, higher cost)
  'gemini-1.5-pro': {
    input: 1.25 / 1_000_000,
    output: 5.00 / 1_000_000,
  },
  'gemini-2.5-pro': {
    input: 1.25 / 1_000_000,
    output: 10.00 / 1_000_000,
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

const findPricingKey = (model: string): string | null => {
  if (!model || model.trim().length === 0) {
    return null;
  }
  const normalized = model.trim().toLowerCase();
  if (GEMINI_PRICING[normalized]) {
    return normalized;
  }

  for (const key of Object.keys(GEMINI_PRICING)) {
    const baseKey = key.split('-preview')[0];
    if (key.startsWith(normalized) || normalized.startsWith(baseKey)) {
      return key;
    }
  }

  return null;
};

export const hasPricingForModel = (model: string): boolean => Boolean(findPricingKey(model));

// Get pricing for a model, with fallback to default
export function getModelPricing(model: string): { input: number; output: number } {
  const matchedKey = findPricingKey(model);
  if (matchedKey) {
    return GEMINI_PRICING[matchedKey];
  }

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

// Estimate cost from total tokens (input + output).
export function estimateMonthlyCost(units: number): number {
  const totalTokens = Math.max(0, units);
  const inputTokens = totalTokens * (2 / 3);
  const outputTokens = totalTokens / 3;
  const pricing = GEMINI_PRICING[DEFAULT_MODEL];
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

// Project end-of-month cost from current total tokens.
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
