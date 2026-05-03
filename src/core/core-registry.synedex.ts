import type { ToolContract } from './tool-contract';
import type { AppId } from './app.config';

export interface CoreRegistryEntry {
  appName?: AppId | 'shared';
  contract: () => Promise<ToolContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

export const CORE_REGISTRY: Record<string, CoreRegistryEntry> = {
  // Synedex module entries are declared here.
  // Example:
  // 'focus-grid': {
  //   appName: 'synedex',
  //   contract: () => import('../synedex-games/focus-grid/focus-grid.contract').then((m) => m.contract),
  //   kernel: () => import('../synedex-games/focus-grid/focus-grid.kernel'),
  // },
};

function belongsToApp(entry: CoreRegistryEntry, appId: AppId): boolean {
  const owner = entry.appName ?? 'synedex';
  return owner === 'shared' || owner === appId;
}

export function getCoreRegistryForApp(appId: AppId): Record<string, CoreRegistryEntry> {
  return Object.fromEntries(
    Object.entries(CORE_REGISTRY).filter(([, entry]) => belongsToApp(entry, appId)),
  );
}
