import type { ModuleContract } from '../../core/module-contract';
import type { AppId } from '../../core/app.config';
import type { ModuleKind } from '../../core/app-catalog';

export interface CoreRegistryEntry {
  appName?: AppId | 'shared';
  kind?: ModuleKind;
  contract: () => Promise<ModuleContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

export const CORE_REGISTRY: Record<string, CoreRegistryEntry> = {
  'mental-math': {
    appName: 'synedex',
    contract: () => import('./games/mental-math/mental-math.contract').then((m) => m.contract),
    kernel: () => import('./games/mental-math/mental-math.kernel'),
  },
  sudoku: {
    appName: 'synedex',
    contract: () => import('./games/sudoku/sudoku.contract').then((m) => m.contract),
    kernel: () => import('./games/sudoku/sudoku.kernel'),
  },
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
