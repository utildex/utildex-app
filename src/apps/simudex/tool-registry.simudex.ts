import { Type } from '@angular/core';
import { ModuleContract } from '../../core/module-contract';
import { getCoreRegistryForApp } from './core-registry.simudex';
import { getAppId, type AppId } from '../../core/app.config';
import type { ModuleKind } from '../../core/app-catalog';

export interface ModuleRegistrySourceEntry {
  appName?: AppId | 'shared';
  kind?: ModuleKind;
  component: () => Promise<Type<unknown>>;
  contract: () => Promise<ModuleContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

type ComponentLoader = () => Promise<Type<unknown>>;

const MODULE_COMPONENT_LOADERS: Record<string, ComponentLoader> = {
  'minimal-debian-terminal': () =>
    import('../../simudex-simulations/minimal-debian-terminal/minimal-debian-terminal.component').then(
      (m) => m.MinimalDebianTerminalComponent,
    ),
};

function assertContractIdMatchesModuleId(
  moduleId: string,
  contract: ModuleContract,
): ModuleContract {
  if (contract.id !== moduleId) {
    throw new Error(
      `Module contract id mismatch for registry key "${moduleId}": loaded contract.id="${contract.id}"`,
    );
  }

  return contract;
}

function buildModuleRegistrySourceMap(): Record<string, ModuleRegistrySourceEntry> {
  const map: Record<string, ModuleRegistrySourceEntry> = {};
  const coreRegistry = getCoreRegistryForApp(getAppId());

  for (const [moduleId, coreEntry] of Object.entries(coreRegistry)) {
    if (map[moduleId]) {
      throw new Error(`Duplicate module id detected while building registry: ${moduleId}`);
    }

    const component = MODULE_COMPONENT_LOADERS[moduleId];
    if (!component) {
      throw new Error(`Missing Angular component loader for module id: ${moduleId}`);
    }

    const contract = () =>
      coreEntry
        .contract()
        .then((loadedContract) => assertContractIdMatchesModuleId(moduleId, loadedContract));

    map[moduleId] = {
      ...coreEntry,
      component,
      contract,
    };
  }

  for (const moduleId of Object.keys(coreRegistry)) {
    if (!MODULE_COMPONENT_LOADERS[moduleId]) {
      throw new Error(
        `Core registry entry declared without component loader for module id: ${moduleId}`,
      );
    }
  }

  return map;
}

export const MODULE_REGISTRY_SOURCE_MAP: Record<string, ModuleRegistrySourceEntry> =
  buildModuleRegistrySourceMap();
