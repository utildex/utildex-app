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
      appConfigFile: 'src/apps/${options.id}/entry/app.config.ts',
      entryPointFile: 'src/apps/${options.id}/entry/index.tsx',
      indexHtmlFile: 'src/apps/${options.id}/entry/index.html',
      manifestFile: 'src/apps/${options.id}/entry/manifest.webmanifest',
      serviceWorkerConfigFile: 'src/apps/${options.id}/entry/ngsw-config.json',
      appComponentFile: 'src/apps/${options.id}/shell/app.component.ts',
      appComponentTemplateFile: 'src/apps/${options.id}/shell/app.component.html',
      routesFile: 'src/apps/${options.id}/routing/app.routes.ts',
      coreRegistryFile: 'src/apps/${options.id}/core-registry.${options.id}.ts',
      moduleRegistryFile: 'src/apps/${options.id}/tool-registry.${options.id}.ts',
      toolSpaceRegistryFile: 'src/apps/${options.id}/tool-space-registry.${options.id}.ts',
      offlineRouteLoadersFile: 'src/apps/${options.id}/offline-route-loaders.${options.id}.ts',
      contentRoots: [{ label: '${options.id}-${pluralKind(options.kind)}', kind: '${options.kind}', path: '${options.contentRoot}' }],
      seoDir: 'src/apps/${options.id}/seo',
    },
  }`;
}

export function appConfigTemplate(options: AppScaffoldOptions): string {
  return `import type { AppConfigData } from '../../../core/app-catalog';

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
