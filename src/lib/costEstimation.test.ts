import { describe, it, expect } from 'vitest';
import {
  GEMINI_PRICING,
  getModelPricing,
  calculateTokenCost,
  estimateMonthlyCost,
  projectMonthlyCost,
  calculateActualMonthlyCost,
  projectTokenCost,
} from './costEstimation';

describe('costEstimation', () => {
  describe('GEMINI_PRICING', () => {
    it('has pricing for flash models', () => {
      expect(GEMINI_PRICING['gemini-1.5-flash']).toBeDefined();
      expect(GEMINI_PRICING['gemini-2.0-flash']).toBeDefined();
    });

    it('has pricing for pro models', () => {
      expect(GEMINI_PRICING['gemini-1.5-pro']).toBeDefined();
    });

    it('has input and output prices for each model', () => {
      for (const [model, pricing] of Object.entries(GEMINI_PRICING)) {
        expect(pricing.input).toBeDefined();
        expect(pricing.output).toBeDefined();
        expect(pricing.input).toBeGreaterThan(0);
        expect(pricing.output).toBeGreaterThan(0);
      }
    });
  });

  describe('getModelPricing', () => {
    it('returns exact match for known models', () => {
      const pricing = getModelPricing('gemini-1.5-flash');
      expect(pricing).toBe(GEMINI_PRICING['gemini-1.5-flash']);
    });

    it('returns default pricing for unknown models', () => {
      const pricing = getModelPricing('unknown-model-xyz');
      expect(pricing).toBe(GEMINI_PRICING['gemini-1.5-flash']);
    });

    it('matches by prefix for preview models', () => {
      const pricing = getModelPricing('gemini-2.5-flash-preview');
      expect(pricing).toBeDefined();
      expect(pricing.input).toBeGreaterThan(0);
    });
  });

  describe('calculateTokenCost', () => {
    it('calculates cost correctly for known model', () => {
      const result = calculateTokenCost('gemini-1.5-flash', 1000, 500);
      const pricing = GEMINI_PRICING['gemini-1.5-flash'];

      expect(result.inputCost).toBe(1000 * pricing.input);
      expect(result.outputCost).toBe(500 * pricing.output);
      expect(result.totalCost).toBe(result.inputCost + result.outputCost);
    });

    it('returns zero cost for zero tokens', () => {
      const result = calculateTokenCost('gemini-1.5-flash', 0, 0);
      expect(result.inputCost).toBe(0);
      expect(result.outputCost).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('handles negative tokens by clamping to zero', () => {
      const result = calculateTokenCost('gemini-1.5-flash', -100, -50);
      expect(result.inputCost).toBe(0);
      expect(result.outputCost).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('uses fallback pricing for unknown models', () => {
      const result = calculateTokenCost('unknown-model', 1000, 500);
      const fallbackPricing = GEMINI_PRICING['gemini-1.5-flash'];

      expect(result.inputCost).toBe(1000 * fallbackPricing.input);
      expect(result.outputCost).toBe(500 * fallbackPricing.output);
    });
  });

  describe('estimateMonthlyCost', () => {
    it('returns positive value for positive units', () => {
      const cost = estimateMonthlyCost(10000);
      expect(cost).toBeGreaterThan(0);
    });

    it('returns zero for zero units', () => {
      const cost = estimateMonthlyCost(0);
      expect(cost).toBe(0);
    });

    it('handles negative units by clamping to zero', () => {
      const cost = estimateMonthlyCost(-1000);
      expect(cost).toBe(0);
    });
  });

  describe('projectMonthlyCost', () => {
    it('projects cost based on current day of month', () => {
      // Use a date in the middle of the month
      const midMonth = new Date(Date.UTC(2024, 5, 15)); // June 15
      const cost = projectMonthlyCost(1000, midMonth);

      // Should be roughly 2x the daily rate (30/15 = 2)
      const directCost = estimateMonthlyCost(1000);
      expect(cost).toBeGreaterThan(directCost);
    });

    it('returns estimated cost at end of month', () => {
      // Use last day of a 30-day month
      const lastDay = new Date(Date.UTC(2024, 5, 30)); // June 30
      const cost = projectMonthlyCost(30000, lastDay);

      // Should be approximately equal to direct cost
      const directCost = estimateMonthlyCost(30000);
      expect(cost).toBeCloseTo(directCost, 10);
    });
  });

  describe('calculateActualMonthlyCost', () => {
    it('calculates cost from actual tokens', () => {
      const cost = calculateActualMonthlyCost(10000, 5000, 'gemini-1.5-flash');
      expect(cost).toBeGreaterThan(0);
    });

    it('uses default model when not specified', () => {
      const cost = calculateActualMonthlyCost(10000, 5000);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('projectTokenCost', () => {
    it('projects token cost based on current day', () => {
      const midMonth = new Date(Date.UTC(2024, 5, 15));
      const cost = projectTokenCost(10000, 5000, 'gemini-1.5-flash', midMonth);

      const actualCost = calculateActualMonthlyCost(10000, 5000, 'gemini-1.5-flash');
      expect(cost).toBeGreaterThan(actualCost);
    });

    it('uses default values for optional parameters', () => {
      const cost = projectTokenCost(10000, 5000);
      expect(cost).toBeGreaterThan(0);
    });
  });
});
