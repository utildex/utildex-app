import type { AppConfigData } from '../../../core/app-catalog';

export const APP_CONFIG_DATA = {
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
} as const satisfies AppConfigData;
