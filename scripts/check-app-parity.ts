/**
 * check-app-parity.ts
 *
 * Verifies that each app's CORE_REGISTRY and TOOL_COMPONENT_LOADERS are kept in sync:
 *   - Every key in CORE_REGISTRY must have a matching entry in TOOL_COMPONENT_LOADERS.
 *   - Every key in TOOL_COMPONENT_LOADERS must have a matching entry in CORE_REGISTRY.
 *
 * Checked for both utildex and synedex variants.
 * Run via: tsx scripts/check-app-parity.ts
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts the set of top-level string keys from a TypeScript object literal.
 *
 * Works by finding the object declaration, then walking character-by-character
 * tracking brace/paren depth — keys are captured when depth is 0 (direct children
 * of the outer object). Handles line comments, nested objects, and arrow functions.
 */
function extractObjectKeys(filePath: string, objectName: string): Set<string> {
  const source = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set<string>();

  // Find the variable declaration (e.g. "const CORE_REGISTRY" or "const TOOL_COMPONENT_LOADERS")
  const declRegex = new RegExp(`(?:const|export const)\\s+${objectName}\\b`);
  const declMatch = declRegex.exec(source);
  if (!declMatch) return keys;

  // Find the opening '{' of the object literal
  const openBraceIdx = source.indexOf('{', declMatch.index + declMatch[0].length);
  if (openBraceIdx === -1) return keys;

  // Walk to the matching closing brace
  let depth = 0;
  let objectEndIdx = openBraceIdx;
  for (let i = openBraceIdx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        objectEndIdx = i;
        break;
      }
    }
  }

  const body = source.slice(openBraceIdx + 1, objectEndIdx);

  // Scan lines at body depth 0 to capture top-level keys
  let bodyDepth = 0;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();

    // Skip line comments
    if (trimmed.startsWith('//')) continue;

    if (bodyDepth === 0) {
      const keyMatch = /^['"]([^'"]+)['"]\s*:/.exec(trimmed);
      if (keyMatch) {
        keys.add(keyMatch[1]);
      }
    }

    // Track depth changes on this line
    for (const ch of trimmed) {
      if (ch === '{' || ch === '(') bodyDepth++;
      else if (ch === '}' || ch === ')') bodyDepth--;
    }
  }

  return keys;
}

function checkRegistryParity(
  coreFilePath: string,
  componentFilePath: string,
  label: string,
): boolean {
  const coreKeys = extractObjectKeys(coreFilePath, 'CORE_REGISTRY');
  const componentKeys = extractObjectKeys(componentFilePath, 'TOOL_COMPONENT_LOADERS');

  let ok = true;

  const missingComponents = [...coreKeys].filter((k) => !componentKeys.has(k));
  if (missingComponents.length > 0) {
    console.error(
      `[ERROR] [${label}] CORE_REGISTRY keys without a TOOL_COMPONENT_LOADERS entry:\n` +
        missingComponents.map((k) => `  - ${k}`).join('\n'),
    );
    ok = false;
  }

  const orphanComponents = [...componentKeys].filter((k) => !coreKeys.has(k));
  if (orphanComponents.length > 0) {
    console.error(
      `[ERROR] [${label}] TOOL_COMPONENT_LOADERS keys without a CORE_REGISTRY entry:\n` +
        orphanComponents.map((k) => `  - ${k}`).join('\n'),
    );
    ok = false;
  }

  if (ok) {
    console.log(`[OK]    [${label}] Registry parity passed (${coreKeys.size} entries)`);
  }

  return ok;
}

async function main() {
  console.log('Starting App Registry Parity Check...\n');
  let success = true;

  const src = path.join(process.cwd(), 'src', 'core');

  if (
    !checkRegistryParity(
      path.join(src, 'core-registry.ts'),
      path.join(src, 'tool-registry.ts'),
      'utildex',
    )
  ) {
    success = false;
  }

  if (
    !checkRegistryParity(
      path.join(src, 'core-registry.synedex.ts'),
      path.join(src, 'tool-registry.synedex.ts'),
      'synedex',
    )
  ) {
    success = false;
  }

  if (!success) {
    console.error('\nParity check failed. Fix registry mismatches before building.');
    process.exit(1);
  }

  console.log('\nAll app registry parity checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
