import type { Type } from '@angular/core';
import { getAppId, type AppId } from './app.config';
import type { ModuleKind } from './app-catalog';
import type { ModuleContract } from './module-contract';
import {
  resolveModuleKind,
  resolveModuleOwner,
  type ModuleOwnerMetadata,
} from './module-core-registry';
import {
  MODULE_REGISTRY_SOURCE_MAP,
  type ModuleRegistrySourceEntry,
} from '../apps/utildex/module-registry';

export type ModuleComponentLoader = () => Promise<Type<unknown>>;

export interface ModuleRegistryEntry {
  appId: AppId | 'shared';
  kind: ModuleKind;
  component: ModuleComponentLoader;
  contract: () => Promise<ModuleContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

function toModuleRegistryEntry(
  entry: ModuleRegistrySourceEntry,
  fallbackAppId: AppId,
): ModuleRegistryEntry {
  const ownerMetadata = entry as ModuleRegistrySourceEntry & ModuleOwnerMetadata;

  return {
    appId: resolveModuleOwner(ownerMetadata, fallbackAppId),
    kind: resolveModuleKind(ownerMetadata, fallbackAppId),
    component: entry.component,
    contract: entry.contract,
    kernel: entry.kernel,
  };
}

export const MODULE_REGISTRY_MAP: Record<string, ModuleRegistryEntry> = Object.fromEntries(
  Object.entries(MODULE_REGISTRY_SOURCE_MAP).map(([moduleId, entry]) => [
    moduleId,
    toModuleRegistryEntry(entry, getAppId()),
  ]),
);

export const MODULE_COMPONENT_MAP: Record<string, ModuleComponentLoader> = Object.fromEntries(
  Object.entries(MODULE_REGISTRY_MAP).map(([id, entry]) => [id, entry.component]),
);

export function getModuleComponent(id: string): ModuleComponentLoader | null {
  return MODULE_REGISTRY_MAP[id]?.component || null;
}
