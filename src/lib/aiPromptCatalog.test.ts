import { describe, expect, it } from 'vitest';
import { getPromptCatalog, getPromptDefinition } from '@/lib/aiPromptCatalog';

describe('ai prompt catalog', () => {
  it('builds preview prompts', () => {
    const catalog = getPromptCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    catalog.forEach((entry) => {
      expect(entry.prompt.length).toBeGreaterThan(10);
      expect(entry.id).toBeTruthy();
    });
  });

  it('returns a prompt definition by id', () => {
    const definition = getPromptDefinition('generate-words');
    expect(definition?.id).toBe('generate-words');
  });

  it('returns null for missing id', () => {
    expect(getPromptDefinition('missing-id' as never)).toBeNull();
  });
});
