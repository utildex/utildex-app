export interface AppConfigData {
  appId: string;
  appName: string;
  toolsRouteSegment: string;
  hosting: {
    defaultPublicBaseUrl: string;
  };
  githubUrl: string;
}

export interface AppContentRootDefinition {
  label: string;
  path: string;
}

export interface AppSourceDefinition {
  appConfigFile: string;
  entryPointFile: string;
  indexHtmlFile: string;
  manifestFile: string;
  serviceWorkerConfigFile: string;
  appComponentFile: string;
  appComponentTemplateFile: string;
  routesFile: string;
  coreRegistryFile: string;
  toolRegistryFile: string;
  toolSpaceRegistryFile: string;
  offlineRouteLoadersFile: string;
  contentRoots: readonly AppContentRootDefinition[];
  articleRegistryFile?: string;
  seoDir: string;
}

export interface AppCapabilities {
  articles: boolean;
  dashboard: boolean;
  headless: boolean;
  mcp: boolean;
  spaces: boolean;
}

export interface AppCatalogEntry extends AppConfigData {
  buildConfiguration: string;
  outputPath: string;
  source: AppSourceDefinition;
  capabilities: AppCapabilities;
}

export const APP_CATALOG = {
  utildex: {
    appId: 'utildex',
    appName: 'Utildex',
    toolsRouteSegment: 'tools',
    hosting: {
      defaultPublicBaseUrl: 'https://utildex.com',
    },
    githubUrl: 'https://github.com/utildex/utildex',
    buildConfiguration: 'utildex',
    outputPath: 'dist/utildex',
    source: {
      appConfigFile: 'app.config.ts',
      entryPointFile: 'index.tsx',
      indexHtmlFile: 'index.html',
      manifestFile: 'manifest.webmanifest',
      serviceWorkerConfigFile: 'ngsw-config.json',
      appComponentFile: 'src/app.component.ts',
      appComponentTemplateFile: 'src/app.component.html',
      routesFile: 'src/app.routes.ts',
      coreRegistryFile: 'src/core/core-registry.ts',
      toolRegistryFile: 'src/core/tool-registry.ts',
      toolSpaceRegistryFile: 'src/data/tool-space-registry.ts',
      offlineRouteLoadersFile: 'src/services/offline-route-loaders.ts',
      contentRoots: [{ label: 'utildex-tools', path: 'src/utildex-tools' }],
      articleRegistryFile: 'src/data/article-registry.ts',
      seoDir: 'src/seo/utildex',
    },
    capabilities: {
      articles: true,
      dashboard: true,
      headless: true,
      mcp: true,
      spaces: true,
    },
  },
  synedex: {
    appId: 'synedex',
    appName: 'Synedex',
    toolsRouteSegment: 'games',
    hosting: {
      defaultPublicBaseUrl: 'https://synedex.com',
    },
    githubUrl: 'https://github.com/utildex/utildex-app',
    buildConfiguration: 'synedex',
    outputPath: 'dist/synedex',
    source: {
      appConfigFile: 'app.config.synedex.ts',
      entryPointFile: 'index.synedex.tsx',
      indexHtmlFile: 'index.synedex.html',
      manifestFile: 'manifest.synedex.webmanifest',
      serviceWorkerConfigFile: 'ngsw-config.synedex.json',
      appComponentFile: 'src/app.component.synedex.ts',
      appComponentTemplateFile: 'src/app.component.synedex.html',
      routesFile: 'src/app.routes.synedex.ts',
      coreRegistryFile: 'src/core/core-registry.synedex.ts',
      toolRegistryFile: 'src/core/tool-registry.synedex.ts',
      toolSpaceRegistryFile: 'src/data/tool-space-registry.synedex.ts',
      offlineRouteLoadersFile: 'src/services/offline-route-loaders.synedex.ts',
      contentRoots: [{ label: 'synedex-games', path: 'src/synedex-games' }],
      seoDir: 'src/seo/synedex',
    },
    capabilities: {
      articles: false,
      dashboard: false,
      headless: false,
      mcp: false,
      spaces: false,
    },
  },
} as const satisfies Record<string, AppCatalogEntry>;

export type AppId = keyof typeof APP_CATALOG;

export const DEFAULT_APP_ID: AppId = 'utildex';

export const APP_IDS = Object.keys(APP_CATALOG) as AppId[];

export function isAppId(value: string): value is AppId {
  return APP_IDS.includes(value as AppId);
}

export function getAppCatalogEntry(appId: AppId): (typeof APP_CATALOG)[AppId] {
  return APP_CATALOG[appId];
}
