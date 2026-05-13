import { describe, expect, it } from 'vitest';

import * as headless from '../../dist-headless/headless/index.js';

const PUBLIC_FUNCTIONS = [
  'listHeadlessTools',
  'listHeadlessSpaces',
  'getHeadlessSpace',
  'listHeadlessSpaceIssues',
  'listHeadlessToolsInSpace',
  'getHeadlessTool',
  'callHeadlessTool',
] as const;

describe('built headless bundle exports', () => {
  it.each(PUBLIC_FUNCTIONS)('exports %s as a function', (exportName) => {
    expect(typeof headless[exportName]).toBe('function');
  });

  it('lists Utildex tools from the built artifact', async () => {
    const tools = await headless.listHeadlessTools();

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.map((tool) => tool.id)).not.toContain('sudoku');
  });
});
