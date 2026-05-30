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
  'minimal-debian-terminal': {
    appName: 'simudex',
    contract: () =>
      import('./simulations/minimal-debian-terminal/minimal-debian-terminal.contract').then(
        (m) => m.contract,
      ),
    kernel: () => import('./simulations/minimal-debian-terminal/minimal-debian-terminal.kernel'),
  },
};

function belongsToApp(entry: CoreRegistryEntry, appId: AppId): boolean {
  const owner = entry.appName ?? 'simudex';
  return owner === 'shared' || owner === appId;
}

export function getCoreRegistryForApp(appId: AppId): Record<string, CoreRegistryEntry> {
  return Object.fromEntries(
    Object.entries(CORE_REGISTRY).filter(([, entry]) => belongsToApp(entry, appId)),
  );
}
