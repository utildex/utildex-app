import { describe, expect, it } from 'vitest';

import { listHeadlessTools } from './index';

describe('headless Vitest smoke setup', () => {
  it('lists Utildex headless tools without Synedex-only tools', async () => {
    const tools = await listHeadlessTools();

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.map((tool) => tool.id)).not.toContain('sudoku');
  });
});
