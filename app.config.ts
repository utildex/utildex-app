import type { AppConfigData } from './src/core/app-catalog';

export const APP_CONFIG_DATA = {
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
} as const satisfies AppConfigData;
