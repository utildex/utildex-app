import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST_BUNDLE_PATH = resolve('dist-headless/headless/index.js');
const FORBIDDEN_PATTERNS = [
  'window.',
  'document.',
  'localStorage',
  'sessionStorage',
  'navigator.clipboard',
  'HTMLElement',
  'customElements',
] as const;

const BROWSER_ONLY_KERNEL_SECTIONS = new Set([
  'src/utildex-tools/image-converter/image-converter.kernel.ts',
  'src/utildex-tools/image-resizer/image-resizer.kernel.ts',
  'src/utildex-tools/pdf-to-img/pdf-to-img.kernel.ts',
]);

interface BrowserGlobalHit {
  pattern: string;
  lineNumber: number;
  sourceSection: string;
  line: string;
}

function isAllowedOccurrence(hit: BrowserGlobalHit): boolean {
  if (hit.pattern === 'document.' && hit.line.includes('description:')) {
    // Natural-language contract copy can mention a PDF document; it is not a global access.
    return true;
  }

  if (
    hit.pattern === 'document.' &&
    BROWSER_ONLY_KERNEL_SECTIONS.has(hit.sourceSection) &&
    hit.line.includes('document.createElement("canvas")')
  ) {
    // Existing non-MCP raster/PDF kernels keep browser-only canvas work inside run-time paths.
    return true;
  }

  return false;
}

describe('built headless bundle browser globals', () => {
  it('does not contain unexpected browser-global references', () => {
    const source = readFileSync(DIST_BUNDLE_PATH, 'utf8');
    const hits: BrowserGlobalHit[] = [];
    let sourceSection = '<bundle>';

    source.split('\n').forEach((line, index) => {
      if (line.startsWith('// src/')) {
        sourceSection = line.slice('// '.length).trim();
      }

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (line.includes(pattern)) {
          hits.push({ pattern, lineNumber: index + 1, sourceSection, line: line.trim() });
        }
      }
    });

    const unexpectedHits = hits.filter((hit) => !isAllowedOccurrence(hit));

    expect(unexpectedHits).toEqual([]);
  });
});
