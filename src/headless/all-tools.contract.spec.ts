import { beforeAll, describe, expect, it } from 'vitest';

import { getHeadlessTool, listHeadlessTools } from './index';

describe('all headless tool contracts', () => {
  let toolIds: string[] = [];

  beforeAll(async () => {
    toolIds = (await listHeadlessTools()).map((tool) => tool.id);
  });

  it('loads every registered tool definition in a pure Node environment', async () => {
    expect('window' in globalThis).toBe(false);
    expect('document' in globalThis).toBe(false);
    expect(toolIds.length).toBeGreaterThan(0);

    for (const id of toolIds) {
      const tool = await getHeadlessTool(id);

      expect(tool.id).toBe(id);
      expect(tool.name).toEqual(expect.any(String));
      expect(tool.name).not.toHaveLength(0);
      expect(tool.version).toEqual(expect.any(String));
      expect(tool.version).not.toHaveLength(0);
      expect(Array.isArray(tool.categories)).toBe(true);
      expect(typeof tool.run).toBe('function');
    }
  });
});
