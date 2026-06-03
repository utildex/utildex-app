import type { AppId } from './app.config';
import type { ModuleKind } from './app-catalog';
import { getAppCatalogEntry } from './app-catalog';
import { getCoreRegistryForApp, type CoreRegistryEntry } from '../apps/utildex/core-registry';
import type { ModuleContract } from './module-contract';

export interface ModuleOwnerMetadata {
  appName?: AppId | 'shared';
  kind?: ModuleKind;
}

export interface ModuleCoreRegistryEntry {
  appId: AppId | 'shared';
  kind: ModuleKind;
  contract: () => Promise<ModuleContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

export interface ModuleMcpCompatibilityContext {
  appId: AppId | 'shared';
  activeAppId: AppId;
  kind: ModuleKind;
}

export function resolveModuleOwner(
  entry: ModuleOwnerMetadata,
  fallbackAppId: AppId,
): AppId | 'shared' {
  return entry.appName ?? fallbackAppId;
}

export function getDefaultModuleKindForApp(appId: AppId): ModuleKind {
  const kinds = new Set(getAppCatalogEntry(appId).source.contentRoots.map((root) => root.kind));

  if (kinds.size === 1) {
    return [...kinds][0];
  }

  throw new Error(`App "${appId}" has multiple module kinds. Add an explicit registry entry kind.`);
}

export function resolveModuleKind(entry: ModuleOwnerMetadata, fallbackAppId: AppId): ModuleKind {
  if (entry.kind) {
    return entry.kind;
  }

  const owner = resolveModuleOwner(entry, fallbackAppId);
  return getDefaultModuleKindForApp(owner === 'shared' ? fallbackAppId : owner);
}

export function toModuleCoreRegistryEntry(
  entry: CoreRegistryEntry,
  fallbackAppId: AppId,
): ModuleCoreRegistryEntry {
  return {
    appId: resolveModuleOwner(entry, fallbackAppId),
    kind: resolveModuleKind(entry, fallbackAppId),
    contract: entry.contract,
    kernel: entry.kernel,
  };
}

export function getCoreModuleRegistryForApp(appId: AppId): Record<string, ModuleCoreRegistryEntry> {
  return Object.fromEntries(
    Object.entries(getCoreRegistryForApp(appId)).map(([moduleId, entry]) => [
      moduleId,
      toModuleCoreRegistryEntry(entry, appId),
    ]),
  );
}

export function isMcpCompatibleModule(
  contract: ModuleContract,
  context: ModuleMcpCompatibilityContext,
): boolean {
  const ownedByActiveApp = context.appId === context.activeAppId || context.appId === 'shared';
  const canUseMcp =
    context.activeAppId === 'utildex' && context.kind === 'tool' && ownedByActiveApp;

  if (!canUseMcp) {
    return false;
  }

  return contract.mcp?.compatible ?? true;
}
