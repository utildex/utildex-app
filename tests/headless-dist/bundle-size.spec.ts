import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST_BUNDLE_PATH = resolve('dist-headless/headless/index.js');
const MAX_BUNDLE_BYTES = 450 * 1024;

describe('built headless bundle size', () => {
  it('stays within the initial audit budget', () => {
    const actualBytes = statSync(DIST_BUNDLE_PATH).size;

    if (actualBytes > MAX_BUNDLE_BYTES) {
      throw new Error(
        `Headless bundle is ${actualBytes} bytes, exceeding the ${MAX_BUNDLE_BYTES} byte budget.`,
      );
    }

    expect(actualBytes).toBeGreaterThan(0);
  });
});
