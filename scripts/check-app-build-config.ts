import * as fs from 'fs';
import * as path from 'path';
import { APP_IDS, DEFAULT_APP_ID, getAppCatalogEntry } from '../src/core/app-catalog';

interface AngularAssetObject {
  glob?: string;
  input?: string;
  output?: string;
  ignore?: string[];
}

type AngularAsset = string | AngularAssetObject;

interface AngularFileReplacement {
  replace?: string;
  with?: string;
}

interface AngularBuildConfiguration {
  serviceWorker?: string;
  index?: {
    input?: string;
    output?: string;
  };
  outputPath?: {
    base?: string;
    browser?: string;
  };
  assets?: AngularAsset[];
  fileReplacements?: AngularFileReplacement[];
}

interface AngularServeConfiguration {
  buildTarget?: string;
}

interface AngularWorkspace {
  projects?: {
    app?: {
      architect?: {
        build?: {
          configurations?: Record<string, AngularBuildConfiguration>;
        };
        serve?: {
          configurations?: Record<string, AngularServeConfiguration>;
        };
      };
    };
  };
}

interface PackageJson {
  scripts?: Record<string, string>;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8')) as T;
}

function normalizePath(value: string | undefined): string {
  const normalized = (value ?? '')
    .replace(/^[.][/\\]/, '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');
  return normalized === '.' ? '' : normalized;
}

function reportMismatch(label: string, expected: string, actual: string | undefined): boolean {
  if (expected === (actual ?? '')) return true;
  console.error(`[ERROR] ${label}: expected "${expected}", got "${actual ?? '<missing>'}"`);
  return false;
}

function hasAssetInput(assets: readonly AngularAsset[] | undefined, input: string): boolean {
  return Boolean(
    assets?.some((asset) => typeof asset !== 'string' && normalizePath(asset.input) === input),
  );
}

function hasRootManifestAsset(
  assets: readonly AngularAsset[] | undefined,
  manifestFile: string,
): boolean {
  return Boolean(
    assets?.some(
      (asset) =>
        typeof asset !== 'string' &&
        normalizePath(asset.input) === '' &&
        asset.glob === manifestFile &&
        asset.output === '.',
    ),
  );
}

function hasFileReplacement(
  replacements: readonly AngularFileReplacement[] | undefined,
  replace: string,
  withFile: string,
): boolean {
  return Boolean(
    replacements?.some(
      (entry) => normalizePath(entry.replace) === replace && normalizePath(entry.with) === withFile,
    ),
  );
}

function checkAngularConfig(): boolean {
  const workspace = readJson<AngularWorkspace>('angular.json');
  const buildConfigs = workspace.projects?.app?.architect?.build?.configurations ?? {};
  const serveConfigs = workspace.projects?.app?.architect?.serve?.configurations ?? {};
  let ok = true;

  for (const appId of APP_IDS) {
    const app = getAppCatalogEntry(appId);
    const buildConfig = buildConfigs[app.buildConfiguration];
    const serveConfig = serveConfigs[app.buildConfiguration];

    if (!buildConfig) {
      console.error(
        `[ERROR] [${appId}] Missing Angular build configuration "${app.buildConfiguration}".`,
      );
      ok = false;
      continue;
    }

    if (!serveConfig) {
      console.error(
        `[ERROR] [${appId}] Missing Angular serve configuration "${app.buildConfiguration}".`,
      );
      ok = false;
    } else {
      ok =
        reportMismatch(
          `[${appId}] serve buildTarget`,
          `app:build:${app.buildConfiguration}`,
          serveConfig.buildTarget,
        ) && ok;
    }

    ok =
      reportMismatch(
        `[${appId}] build outputPath.base`,
        normalizePath(app.outputPath),
        normalizePath(buildConfig.outputPath?.base),
      ) && ok;
    ok =
      reportMismatch(
        `[${appId}] Docker output path convention`,
        `dist/${app.buildConfiguration}`,
        normalizePath(app.outputPath),
      ) && ok;
    ok =
      reportMismatch(
        `[${appId}] build serviceWorker`,
        app.source.serviceWorkerConfigFile,
        buildConfig.serviceWorker,
      ) && ok;

    if (!hasAssetInput(buildConfig.assets, normalizePath(app.source.seoDir))) {
      console.error(
        `[ERROR] [${appId}] Angular assets do not include SEO dir "${app.source.seoDir}".`,
      );
      ok = false;
    }

    if (!hasRootManifestAsset(buildConfig.assets, app.source.manifestFile)) {
      console.error(
        `[ERROR] [${appId}] Angular assets do not copy root manifest "${app.source.manifestFile}".`,
      );
      ok = false;
    }

    if (appId !== DEFAULT_APP_ID) {
      ok =
        reportMismatch(
          `[${appId}] index input`,
          app.source.indexHtmlFile,
          buildConfig.index?.input,
        ) && ok;
      ok = reportMismatch(`[${appId}] index output`, 'index.html', buildConfig.index?.output) && ok;

      const expectedReplacements = [
        ['index.tsx', app.source.entryPointFile],
        ['app.config.ts', app.source.appConfigFile],
        ['src/core/core-registry.ts', app.source.coreRegistryFile],
        ['src/core/tool-registry.ts', app.source.toolRegistryFile],
        ['src/data/tool-space-registry.ts', app.source.toolSpaceRegistryFile],
        ['src/services/offline-route-loaders.ts', app.source.offlineRouteLoadersFile],
      ];

      for (const [replace, withFile] of expectedReplacements) {
        if (!hasFileReplacement(buildConfig.fileReplacements, replace, withFile)) {
          console.error(`[ERROR] [${appId}] Missing file replacement ${replace} -> ${withFile}.`);
          ok = false;
        }
      }
    }
  }

  if (ok) {
    console.log(
      `[OK]    [multi-app] Angular build/serve config parity passed (${APP_IDS.length} apps)`,
    );
  }

  return ok;
}

function checkPackageScripts(): boolean {
  const pkg = readJson<PackageJson>('package.json');
  const scripts = pkg.scripts ?? {};
  const requiredScripts = ['dev:app', 'build:app', 'preview:app', 'sitemap:app', 'sitemap:all'];
  let ok = true;

  for (const script of requiredScripts) {
    if (!scripts[script]) {
      console.error(`[ERROR] package.json missing generic script "${script}".`);
      ok = false;
    }
  }

  if (!scripts['prebuild:checks']?.includes('check:app-build-config')) {
    console.error('[ERROR] prebuild:checks must include check:app-build-config.');
    ok = false;
  }

  if (!scripts['prebuild:checks']?.includes('sitemap:all')) {
    console.error('[ERROR] prebuild:checks must include sitemap:all.');
    ok = false;
  }

  if (ok) {
    console.log('[OK]    [multi-app] Generic package script parity passed');
  }

  return ok;
}

function main() {
  console.log('Starting App Build Config Check...\n');
  const success = checkAngularConfig() && checkPackageScripts();

  if (!success) {
    console.error(
      '\nApp build config check failed. Fix catalog/build script drift before building.',
    );
    process.exit(1);
  }

  console.log('\nAll app build config checks passed.');
}

main();
