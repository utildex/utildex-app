import type { AppScaffoldOptions } from '../types';

export function emptyCoreRegistryTemplate(options: AppScaffoldOptions): string {
  return `import type { ModuleContract } from './module-contract';
import type { AppId } from './app.config';
import type { ModuleKind } from './app-catalog';

export interface CoreRegistryEntry {
  appName?: AppId | 'shared';
  kind?: ModuleKind;
  contract: () => Promise<ModuleContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

export const CORE_REGISTRY: Record<string, CoreRegistryEntry> = {};

function belongsToApp(entry: CoreRegistryEntry, appId: AppId): boolean {
  const owner = entry.appName ?? '${options.id}';
  return owner === 'shared' || owner === appId;
}

export function getCoreRegistryForApp(appId: AppId): Record<string, CoreRegistryEntry> {
  return Object.fromEntries(
    Object.entries(CORE_REGISTRY).filter(([, entry]) => belongsToApp(entry, appId)),
  );
}
`;
}

export function emptyModuleRegistryTemplate(): string {
  return `import { Type } from '@angular/core';
import { ModuleContract } from './module-contract';
import { getCoreRegistryForApp } from './core-registry';
import { getAppId, type AppId } from './app.config';
import type { ModuleKind } from './app-catalog';

export interface ModuleRegistrySourceEntry {
  appName?: AppId | 'shared';
  kind?: ModuleKind;
  component: () => Promise<Type<unknown>>;
  contract: () => Promise<ModuleContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

type ComponentLoader = () => Promise<Type<unknown>>;

const MODULE_COMPONENT_LOADERS: Record<string, ComponentLoader> = {};

function assertContractIdMatchesModuleId(moduleId: string, contract: ModuleContract): ModuleContract {
  if (contract.id !== moduleId) {
    throw new Error(
      \`Module contract id mismatch for registry key "\${moduleId}": loaded contract.id="\${contract.id}"\`,
    );
  }

  return contract;
}

function buildModuleRegistrySourceMap(): Record<string, ModuleRegistrySourceEntry> {
  const map: Record<string, ModuleRegistrySourceEntry> = {};
  const coreRegistry = getCoreRegistryForApp(getAppId());

  for (const [moduleId, coreEntry] of Object.entries(coreRegistry)) {
    if (map[moduleId]) {
      throw new Error(\`Duplicate module id detected while building registry: \${moduleId}\`);
    }

    const component = MODULE_COMPONENT_LOADERS[moduleId];
    if (!component) {
      throw new Error(\`Missing Angular component loader for module id: \${moduleId}\`);
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
        \`Core registry entry declared without component loader for module id: \${moduleId}\`,
      );
    }
  }

  return map;
}

export const MODULE_REGISTRY_SOURCE_MAP: Record<string, ModuleRegistrySourceEntry> =
  buildModuleRegistrySourceMap();
`;
}

export function emptyToolSpaceRegistryTemplate(): string {
  return `import type { ToolSpaceDefinition } from '../core/tool-space';
import type { AppId } from '../core/app.config';

export const DEFAULT_TOOL_SPACE_ID = '';

export const TOOL_SPACES_REGISTRY: ToolSpaceDefinition[] = [];

export function getToolSpacesForApp(appId: AppId): ToolSpaceDefinition[] {
  return TOOL_SPACES_REGISTRY.filter((space) => {
    const owner = space.appName ?? 'shared';
    return owner === 'shared' || owner === appId;
  });
}
`;
}

export function offlineRouteLoadersTemplate(options: AppScaffoldOptions): string {
  return `export const OFFLINE_ROUTE_LOADERS: Array<() => Promise<unknown>> = [
  () => import('../pages/${options.id}-welcome/${options.id}-welcome.component'),
  () => import('../pages/legal/legal.component'),
  () => import('../pages/terms/terms.component'),
  () => import('../pages/privacy/privacy.component'),
  () => import('../pages/all-tools/all-tools.component'),
  () => import('../pages/tool-host/tool-host.component'),
];
`;
}
