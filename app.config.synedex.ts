import type { AppConfigData } from './src/core/app-catalog';

export const APP_CONFIG_DATA = {
  appId: 'synedex',
  appName: 'Synedex',
  toolsRouteSegment: 'games',
  hosting: {
    defaultPublicBaseUrl: 'https://synedex.com',
  },
  githubUrl: 'https://github.com/utildex/utildex-app',
} as const satisfies AppConfigData;
