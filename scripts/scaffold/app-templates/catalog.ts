import type { AppCapabilities } from '../../../src/core/app-catalog';
import { escapeSingleQuoted, objectKey, pluralKind } from '../common';
import type { AppScaffoldOptions } from '../types';

export function defaultCapabilities(): AppCapabilities {
  return {
    articles: false,
    dashboard: false,
    fileBlobs: false,
    headless: false,
    mcp: false,
    spaces: false,
    storageHistory: false,
    tour: false,
    virtualPets: false,
  };
}

export function appCatalogEntryTemplate(options: AppScaffoldOptions): string {
  return `  ${objectKey(options.id)}: {
    appId: '${options.id}',
    appName: '${escapeSingleQuoted(options.name)}',
    toolsRouteSegment: '${options.route}',
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
      defaultPublicBaseUrl: '${escapeSingleQuoted(options.publicBaseUrl)}',
    },
    githubUrl: '${escapeSingleQuoted(options.githubUrl)}',
    buildConfiguration: '${options.id}',
    outputPath: 'dist/${options.id}',
    devServerPort: ${options.port},
    source: {
      appConfigFile: 'app.config.${options.id}.ts',
      entryPointFile: 'index.${options.id}.tsx',
      indexHtmlFile: 'index.${options.id}.html',
      manifestFile: 'manifest.${options.id}.webmanifest',
      serviceWorkerConfigFile: 'ngsw-config.${options.id}.json',
      appComponentFile: 'src/app.component.${options.id}.ts',
      appComponentTemplateFile: 'src/app.component.${options.id}.html',
      routesFile: 'src/app.routes.${options.id}.ts',
      coreRegistryFile: 'src/core/core-registry.${options.id}.ts',
      moduleRegistryFile: 'src/core/tool-registry.${options.id}.ts',
      toolSpaceRegistryFile: 'src/data/tool-space-registry.${options.id}.ts',
      offlineRouteLoadersFile: 'src/services/offline-route-loaders.${options.id}.ts',
      contentRoots: [{ label: '${options.id}-${pluralKind(options.kind)}', kind: '${options.kind}', path: '${options.contentRoot}' }],
      seoDir: 'src/seo/${options.id}',
    },
  }`;
}

export function appConfigTemplate(options: AppScaffoldOptions): string {
  return `import type { AppConfigData } from './src/core/app-catalog';

export const APP_CONFIG_DATA = {
  appId: '${options.id}',
  appName: '${escapeSingleQuoted(options.name)}',
  toolsRouteSegment: '${options.route}',
  capabilities: ${JSON.stringify(defaultCapabilities(), null, 4).replace(/"([^" ]+)":/g, '$1:')},
  hosting: {
    defaultPublicBaseUrl: '${escapeSingleQuoted(options.publicBaseUrl)}',
  },
  githubUrl: '${escapeSingleQuoted(options.githubUrl)}',
} as const satisfies AppConfigData;
`;
}
