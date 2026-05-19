/**
 * check-app-parity.ts
 *
 * Verifies that each app's CORE_REGISTRY and TOOL_COMPONENT_LOADERS are kept in sync:
 *   - Every key in CORE_REGISTRY must have a matching entry in TOOL_COMPONENT_LOADERS.
 *   - Every key in TOOL_COMPONENT_LOADERS must have a matching entry in CORE_REGISTRY.
 *
 * Also verifies that every catalog-declared source file exists so contributors
 * cannot accidentally remove one app's bundle boundary.
 *
 * Checked for every app declared in APP_CATALOG.
 * Run via: tsx scripts/check-app-parity.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import {
  APP_IDS,
  getAppCatalogEntry,
  type AppCatalogEntry,
  type AppConfigData,
} from '../src/core/app-catalog';

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
      const keyMatch = /^(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:/.exec(trimmed);
      if (keyMatch) {
        keys.add(keyMatch[1] ?? keyMatch[2]);
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

function getRequiredAppFiles(app: AppCatalogEntry): string[] {
  return [
    app.source.appConfigFile,
    app.source.entryPointFile,
    app.source.indexHtmlFile,
    app.source.manifestFile,
    app.source.serviceWorkerConfigFile,
    app.source.appComponentFile,
    app.source.appComponentTemplateFile,
    app.source.routesFile,
    app.source.coreRegistryFile,
    app.source.toolRegistryFile,
    app.source.toolSpaceRegistryFile,
    app.source.offlineRouteLoadersFile,
  ];
}

function checkAppFilesExist(): boolean {
  const cwd = process.cwd();
  const missing: string[] = [];

  for (const appId of APP_IDS) {
    const app = getAppCatalogEntry(appId);
    for (const filePath of getRequiredAppFiles(app)) {
      if (!fs.existsSync(path.join(cwd, filePath))) {
        missing.push(`[${appId}] ${filePath}`);
      }
    }

    for (const root of app.source.contentRoots) {
      if (!fs.existsSync(path.join(cwd, root.path))) {
        missing.push(`[${appId}] ${root.path}`);
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      '[ERROR] [multi-app] Missing app file(s) declared in APP_CATALOG:\n' +
        missing.map((p) => `  - ${p}`).join('\n'),
    );
    return false;
  }

  console.log(`[OK]    [multi-app] Catalog file presence passed (${APP_IDS.length} apps)`);
  return true;
}

function compareConfigValue(
  appId: string,
  label: string,
  expected: string,
  actual: string,
): boolean {
  if (expected === actual) return true;

  console.error(
    `[ERROR] [${appId}] APP_CATALOG ${label}="${expected}" does not match APP_CONFIG_DATA ${label}="${actual}"`,
  );
  return false;
}

function compareConfigJson(
  appId: string,
  label: string,
  expected: unknown,
  actual: unknown,
): boolean {
  const expectedJson = JSON.stringify(expected);
  const actualJson = JSON.stringify(actual);
  if (expectedJson === actualJson) return true;

  console.error(
    `[ERROR] [${appId}] APP_CATALOG ${label}=${expectedJson} does not match APP_CONFIG_DATA ${label}=${actualJson}`,
  );
  return false;
}

async function checkAppConfigMatchesCatalog(): Promise<boolean> {
  let ok = true;

  for (const appId of APP_IDS) {
    const app = getAppCatalogEntry(appId);
    const configPath = path.join(process.cwd(), app.source.appConfigFile);
    const mod = (await import(pathToFileURL(configPath).href)) as {
      APP_CONFIG_DATA: AppConfigData;
    };
    const config = mod.APP_CONFIG_DATA;

    ok = compareConfigValue(appId, 'catalog key', appId, app.appId) && ok;
    ok = compareConfigValue(appId, 'appId', app.appId, config.appId) && ok;
    ok = compareConfigValue(appId, 'appName', app.appName, config.appName) && ok;
    ok = compareConfigJson(appId, 'capabilities', app.capabilities, config.capabilities) && ok;
    ok =
      compareConfigValue(
        appId,
        'toolsRouteSegment',
        app.toolsRouteSegment,
        config.toolsRouteSegment,
      ) && ok;
    ok =
      compareConfigValue(
        appId,
        'hosting.defaultPublicBaseUrl',
        app.hosting.defaultPublicBaseUrl,
        config.hosting.defaultPublicBaseUrl,
      ) && ok;
    ok = compareConfigValue(appId, 'githubUrl', app.githubUrl, config.githubUrl) && ok;
  }

  if (ok) {
    console.log(`[OK]    [multi-app] App config/catalog identity parity passed`);
  }

  return ok;
}

async function main() {
  console.log('Starting App Registry Parity Check...\n');
  let success = true;

  for (const appId of APP_IDS) {
    const app = getAppCatalogEntry(appId);
    if (
      !checkRegistryParity(
        path.join(process.cwd(), app.source.coreRegistryFile),
        path.join(process.cwd(), app.source.toolRegistryFile),
        appId,
      )
    ) {
      success = false;
    }
  }

  if (!checkAppFilesExist()) {
    success = false;
  }

  if (!(await checkAppConfigMatchesCatalog())) {
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
