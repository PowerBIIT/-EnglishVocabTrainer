const GEMINI_PRICING = {
  'gemini-1.5-flash': {
    input: 0.075 / 1_000_000,
    output: 0.30 / 1_000_000,
  },
};

const DEFAULT_MODEL = 'gemini-1.5-flash';

export function estimateMonthlyCost(units: number): number {
  const safeUnits = Math.max(0, units);
  const inputTokens = safeUnits / 4;
  const outputTokens = inputTokens * 0.5;
  const pricing = GEMINI_PRICING[DEFAULT_MODEL];
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

export function projectMonthlyCost(units: number, date: Date = new Date()): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = Math.max(1, date.getUTCDate());
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const projectedUnits = (Math.max(0, units) / day) * daysInMonth;
  return estimateMonthlyCost(projectedUnits);
}
