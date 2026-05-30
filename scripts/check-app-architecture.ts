import * as path from 'path';
import {
  APP_CATALOG,
  APP_IDS,
  DEFAULT_APP_ID,
  getAppCatalogEntry,
  type AppCatalogEntry,
  type AppId,
  type ModuleKind,
} from '../src/core/app-catalog';

const MODULE_KINDS = new Set<ModuleKind>(['tool', 'game', 'simulation']);
const IDENTIFIER_RE = /^[a-z][a-z0-9-]*$/;

interface CheckIssue {
  appId: string;
  message: string;
}

function normalized(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function isPortableRelativePath(value: string): boolean {
  if (!value) return false;
  if (value.includes('\\')) return false;
  if (path.isAbsolute(value)) return false;
  return !normalized(value).split('/').includes('..');
}

function addIssue(issues: CheckIssue[], appId: string, message: string): void {
  issues.push({ appId, message });
}

function checkUniqueValue(
  issues: CheckIssue[],
  seen: Map<string, string>,
  appId: string,
  label: string,
  value: string | number,
): void {
  const key = String(value);
  const owner = seen.get(key);
  if (owner) {
    addIssue(issues, appId, `${label} "${key}" is also used by "${owner}".`);
    return;
  }
  seen.set(key, appId);
}

function checkPath(issues: CheckIssue[], appId: string, label: string, value: string): void {
  if (!isPortableRelativePath(value)) {
    addIssue(issues, appId, `${label} must be a portable relative path using forward slashes.`);
  }
}

function checkHttpUrl(issues: CheckIssue[], appId: string, label: string, value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      addIssue(issues, appId, `${label} must use http or https.`);
    }
  } catch {
    addIssue(issues, appId, `${label} must be a valid absolute URL.`);
  }
}

function checkAppCatalogEntry(issues: CheckIssue[], catalogKey: AppId, app: AppCatalogEntry): void {
  if (catalogKey !== app.appId) {
    addIssue(issues, catalogKey, `catalog key does not match appId "${app.appId}".`);
  }

  if (!app.appName.trim()) {
    addIssue(issues, catalogKey, 'appName must be non-empty.');
  }

  if (!IDENTIFIER_RE.test(app.appId)) {
    addIssue(issues, catalogKey, 'appId must be lowercase kebab-case.');
  }

  if (!IDENTIFIER_RE.test(app.buildConfiguration)) {
    addIssue(issues, catalogKey, 'buildConfiguration must be lowercase kebab-case.');
  }

  if (!IDENTIFIER_RE.test(app.toolsRouteSegment)) {
    addIssue(issues, catalogKey, 'toolsRouteSegment must be a lowercase route segment.');
  }

  if (!Number.isInteger(app.devServerPort) || app.devServerPort <= 0) {
    addIssue(issues, catalogKey, 'devServerPort must be a positive integer.');
  }

  checkHttpUrl(
    issues,
    catalogKey,
    'hosting.defaultPublicBaseUrl',
    app.hosting.defaultPublicBaseUrl,
  );
  checkHttpUrl(issues, catalogKey, 'githubUrl', app.githubUrl);

  checkPath(issues, catalogKey, 'outputPath', app.outputPath);
  checkPath(issues, catalogKey, 'source.appConfigFile', app.source.appConfigFile);
  checkPath(issues, catalogKey, 'source.entryPointFile', app.source.entryPointFile);
  checkPath(issues, catalogKey, 'source.indexHtmlFile', app.source.indexHtmlFile);
  checkPath(issues, catalogKey, 'source.manifestFile', app.source.manifestFile);
  checkPath(
    issues,
    catalogKey,
    'source.serviceWorkerConfigFile',
    app.source.serviceWorkerConfigFile,
  );
  checkPath(issues, catalogKey, 'source.appComponentFile', app.source.appComponentFile);
  checkPath(
    issues,
    catalogKey,
    'source.appComponentTemplateFile',
    app.source.appComponentTemplateFile,
  );
  checkPath(issues, catalogKey, 'source.routesFile', app.source.routesFile);
  checkPath(issues, catalogKey, 'source.coreRegistryFile', app.source.coreRegistryFile);
  checkPath(issues, catalogKey, 'source.moduleRegistryFile', app.source.moduleRegistryFile);
  checkPath(issues, catalogKey, 'source.toolSpaceRegistryFile', app.source.toolSpaceRegistryFile);
  checkPath(
    issues,
    catalogKey,
    'source.offlineRouteLoadersFile',
    app.source.offlineRouteLoadersFile,
  );
  checkPath(issues, catalogKey, 'source.seoDir', app.source.seoDir);

  if (!normalized(app.outputPath).startsWith('dist/')) {
    addIssue(issues, catalogKey, 'outputPath must stay under dist/.');
  }

  if (!normalized(app.source.seoDir).startsWith('src/seo/')) {
    addIssue(issues, catalogKey, 'source.seoDir must stay under src/seo/.');
  }

  if (app.source.articleRegistryFile) {
    checkPath(issues, catalogKey, 'source.articleRegistryFile', app.source.articleRegistryFile);
  }

  if (app.capabilities.articles && !app.source.articleRegistryFile) {
    addIssue(issues, catalogKey, 'apps with articles capability need source.articleRegistryFile.');
  }

  if (!app.capabilities.articles && app.source.articleRegistryFile) {
    addIssue(
      issues,
      catalogKey,
      'apps without articles capability should not declare source.articleRegistryFile.',
    );
  }

  if (app.source.contentRoots.length === 0) {
    addIssue(issues, catalogKey, 'source.contentRoots must declare at least one module root.');
  }

  const rootLabels = new Set<string>();
  const rootPaths = new Set<string>();

  for (const root of app.source.contentRoots) {
    if (!root.label) {
      addIssue(issues, catalogKey, 'content root label must be non-empty.');
    }

    if (rootLabels.has(root.label)) {
      addIssue(issues, catalogKey, `duplicate content root label "${root.label}".`);
    }
    rootLabels.add(root.label);

    if (!MODULE_KINDS.has(root.kind)) {
      addIssue(issues, catalogKey, `content root "${root.label}" has unknown kind "${root.kind}".`);
    }

    checkPath(issues, catalogKey, `content root "${root.label}" path`, root.path);

    const rootPath = normalized(root.path);
    if (!rootPath.startsWith('src/')) {
      addIssue(issues, catalogKey, `content root "${root.label}" must stay under src/.`);
    }

    if (rootPaths.has(rootPath)) {
      addIssue(issues, catalogKey, `duplicate content root path "${root.path}".`);
    }
    rootPaths.add(rootPath);
  }
}

function checkCatalog(): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const appIds = new Set(APP_IDS);
  const catalogKeys = Object.keys(APP_CATALOG);

  if (!appIds.has(DEFAULT_APP_ID)) {
    addIssue(issues, 'multi-app', `DEFAULT_APP_ID "${DEFAULT_APP_ID}" is not in APP_IDS.`);
  }

  if (appIds.size !== catalogKeys.length) {
    addIssue(issues, 'multi-app', 'APP_IDS must contain every APP_CATALOG key exactly once.');
  }

  const buildConfigurations = new Map<string, string>();
  const outputPaths = new Map<string, string>();
  const devPorts = new Map<string, string>();
  const contentRootPaths = new Map<string, string>();

  for (const appId of APP_IDS) {
    const app = getAppCatalogEntry(appId);
    checkAppCatalogEntry(issues, appId, app);

    checkUniqueValue(
      issues,
      buildConfigurations,
      appId,
      'buildConfiguration',
      app.buildConfiguration,
    );
    checkUniqueValue(issues, outputPaths, appId, 'outputPath', normalized(app.outputPath));
    checkUniqueValue(issues, devPorts, appId, 'devServerPort', app.devServerPort);

    for (const root of app.source.contentRoots) {
      checkUniqueValue(issues, contentRootPaths, appId, 'content root path', normalized(root.path));
    }
  }

  return issues;
}

function main(): void {
  console.log('Starting App Architecture Check...\n');

  const issues = checkCatalog();

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`[ERROR] [${issue.appId}] ${issue.message}`);
    }

    console.error('\nApp architecture check failed. Fix APP_CATALOG drift before building.');
    process.exit(1);
  }

  console.log(
    `[OK]    [multi-app] App architecture contract passed (${APP_IDS.length} apps, ${APP_IDS.flatMap((appId) => getAppCatalogEntry(appId).source.contentRoots).length} module roots)`,
  );
}

main();
