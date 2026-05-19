import type { AppConfigData } from './src/core/app-catalog';

export const APP_CONFIG_DATA = {
  appId: 'utildex',
  appName: 'Utildex',
  toolsRouteSegment: 'tools',
  hosting: {
    defaultPublicBaseUrl: 'https://utildex.com',
  },
  githubUrl: 'https://github.com/utildex/utildex',
} as const satisfies AppConfigData;
