export interface AppConfigData {
  appId: string;
  appName: string;
  /**
   * Legacy field name retained during the module architecture migration.
   * Treat this as the app's public module route segment.
   */
  toolsRouteSegment: string;
  capabilities: AppCapabilities;
  hosting: {
    defaultPublicBaseUrl: string;
  };
  githubUrl: string;
}

export type ModuleKind = 'tool' | 'game' | 'simulation';

export interface AppContentRootDefinition {
  label: string;
  kind: ModuleKind;
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
  moduleRegistryFile: string;
  toolSpaceRegistryFile: string;
  offlineRouteLoadersFile: string;
  contentRoots: readonly AppContentRootDefinition[];
  articleRegistryFile?: string;
  seoDir: string;
}

export interface AppCapabilities {
  articles: boolean;
  dashboard: boolean;
  fileBlobs: boolean;
  headless: boolean;
  mcp: boolean;
  spaces: boolean;
  storageHistory: boolean;
  tour: boolean;
  virtualPets: boolean;
}

export interface AppCatalogEntry extends AppConfigData {
  buildConfiguration: string;
  outputPath: string;
  devServerPort: number;
  source: AppSourceDefinition;
}

export const APP_CATALOG = {
  utildex: {
    appId: 'utildex',
    appName: 'Utildex',
    toolsRouteSegment: 'tools',
    capabilities: {
      articles: true,
      dashboard: true,
      fileBlobs: true,
      headless: true,
      mcp: true,
      spaces: true,
      storageHistory: true,
      tour: true,
      virtualPets: true,
    },
    hosting: {
      defaultPublicBaseUrl: 'https://utildex.com',
    },
    githubUrl: 'https://github.com/utildex/utildex',
    buildConfiguration: 'utildex',
    outputPath: 'dist/utildex',
    devServerPort: 3000,
    source: {
      appConfigFile: 'src/apps/utildex/entry/app.config.ts',
      entryPointFile: 'src/apps/utildex/entry/index.tsx',
      indexHtmlFile: 'src/apps/utildex/entry/index.html',
      manifestFile: 'src/apps/utildex/entry/manifest.webmanifest',
      serviceWorkerConfigFile: 'src/apps/utildex/entry/ngsw-config.json',
      appComponentFile: 'src/app.component.ts',
      appComponentTemplateFile: 'src/app.component.html',
      routesFile: 'src/app.routes.ts',
      coreRegistryFile: 'src/apps/utildex/core-registry.ts',
      moduleRegistryFile: 'src/apps/utildex/tool-registry.ts',
      toolSpaceRegistryFile: 'src/apps/utildex/tool-space-registry.ts',
      offlineRouteLoadersFile: 'src/apps/utildex/offline-route-loaders.ts',
      contentRoots: [{ label: 'utildex-tools', kind: 'tool', path: 'src/utildex-tools' }],
      articleRegistryFile: 'src/apps/utildex/article-registry.ts',
      seoDir: 'src/apps/utildex/seo',
    },
  },
  synedex: {
    appId: 'synedex',
    appName: 'Synedex',
    toolsRouteSegment: 'games',
    capabilities: {
      articles: false,
      dashboard: false,
      fileBlobs: false,
      headless: false,
      mcp: false,
      spaces: false,
      storageHistory: false,
      tour: false,
      virtualPets: false,
    },
    hosting: {
      defaultPublicBaseUrl: 'https://synedex.com',
    },
    githubUrl: 'https://github.com/utildex/utildex-app',
    buildConfiguration: 'synedex',
    outputPath: 'dist/synedex',
    devServerPort: 3001,
    source: {
      appConfigFile: 'src/apps/synedex/entry/app.config.ts',
      entryPointFile: 'src/apps/synedex/entry/index.tsx',
      indexHtmlFile: 'src/apps/synedex/entry/index.html',
      manifestFile: 'src/apps/synedex/entry/manifest.webmanifest',
      serviceWorkerConfigFile: 'src/apps/synedex/entry/ngsw-config.json',
      appComponentFile: 'src/apps/synedex/app.component.synedex.ts',
      appComponentTemplateFile: 'src/apps/synedex/app.component.synedex.html',
      routesFile: 'src/apps/synedex/app.routes.synedex.ts',
      coreRegistryFile: 'src/apps/synedex/core-registry.synedex.ts',
      moduleRegistryFile: 'src/apps/synedex/tool-registry.synedex.ts',
      toolSpaceRegistryFile: 'src/apps/synedex/tool-space-registry.synedex.ts',
      offlineRouteLoadersFile: 'src/apps/synedex/offline-route-loaders.synedex.ts',
      contentRoots: [{ label: 'synedex-games', kind: 'game', path: 'src/apps/synedex/games' }],
      seoDir: 'src/apps/synedex/seo',
    },
  },
  simudex: {
    appId: 'simudex',
    appName: 'Simudex',
    toolsRouteSegment: 'simulations',
    capabilities: {
      articles: false,
      dashboard: false,
      fileBlobs: false,
      headless: false,
      mcp: false,
      spaces: false,
      storageHistory: false,
      tour: false,
      virtualPets: false,
    },
    hosting: {
      defaultPublicBaseUrl: 'https://simudex.org',
    },
    githubUrl: 'https://github.com/utildex/utildex-app',
    buildConfiguration: 'simudex',
    outputPath: 'dist/simudex',
    devServerPort: 3002,
    source: {
      appConfigFile: 'src/apps/simudex/entry/app.config.ts',
      entryPointFile: 'src/apps/simudex/entry/index.tsx',
      indexHtmlFile: 'src/apps/simudex/entry/index.html',
      manifestFile: 'src/apps/simudex/entry/manifest.webmanifest',
      serviceWorkerConfigFile: 'src/apps/simudex/entry/ngsw-config.json',
      appComponentFile: 'src/apps/simudex/app.component.simudex.ts',
      appComponentTemplateFile: 'src/apps/simudex/app.component.simudex.html',
      routesFile: 'src/apps/simudex/app.routes.simudex.ts',
      coreRegistryFile: 'src/apps/simudex/core-registry.simudex.ts',
      moduleRegistryFile: 'src/apps/simudex/tool-registry.simudex.ts',
      toolSpaceRegistryFile: 'src/apps/simudex/tool-space-registry.simudex.ts',
      offlineRouteLoadersFile: 'src/apps/simudex/offline-route-loaders.simudex.ts',
      contentRoots: [
        {
          label: 'simudex-simulations',
          kind: 'simulation',
          path: 'src/apps/simudex/simulations',
        },
      ],
      seoDir: 'src/apps/simudex/seo',
    },
  },
} as const satisfies Record<string, AppCatalogEntry>;

export type AppId = keyof typeof APP_CATALOG;

export const DEFAULT_APP_ID: AppId = 'utildex';

export const APP_IDS = Object.keys(APP_CATALOG) as AppId[];

export function isAppId(value: string): value is AppId {
  return APP_IDS.includes(value as AppId);
}

export function getAppCatalogEntry(appId: AppId): AppCatalogEntry {
  return APP_CATALOG[appId];
}
