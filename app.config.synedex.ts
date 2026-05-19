import type { AppConfigData } from './src/core/app-catalog';

export const APP_CONFIG_DATA = {
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
} as const satisfies AppConfigData;
