import type { AppScaffoldOptions } from '../types';

export function emptyCoreRegistryTemplate(options: AppScaffoldOptions): string {
  return `import type { ToolContract } from './tool-contract';
import type { AppId } from './app.config';

export interface CoreRegistryEntry {
  appName?: AppId | 'shared';
  contract: () => Promise<ToolContract>;
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

export function emptyToolRegistryTemplate(): string {
  return `import { Type } from '@angular/core';
import { ToolContract } from './tool-contract';
import { getCoreRegistryForApp } from './core-registry';
import { getAppId } from './app.config';

export interface ToolRegistryEntry {
  component: () => Promise<Type<unknown>>;
  contract: () => Promise<ToolContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

type ComponentLoader = () => Promise<Type<unknown>>;

const TOOL_COMPONENT_LOADERS: Record<string, ComponentLoader> = {};

function assertContractIdMatchesToolId(toolId: string, contract: ToolContract): ToolContract {
  if (contract.id !== toolId) {
    throw new Error(
      \`Tool contract id mismatch for registry key "\${toolId}": loaded contract.id="\${contract.id}"\`,
    );
  }

  return contract;
}

function buildToolRegistryMap(): Record<string, ToolRegistryEntry> {
  const map: Record<string, ToolRegistryEntry> = {};
  const coreRegistry = getCoreRegistryForApp(getAppId());

  for (const [toolId, coreEntry] of Object.entries(coreRegistry)) {
    if (map[toolId]) {
      throw new Error(\`Duplicate tool id detected while building registry: \${toolId}\`);
    }

    const component = TOOL_COMPONENT_LOADERS[toolId];
    if (!component) {
      throw new Error(\`Missing Angular component loader for tool id: \${toolId}\`);
    }

    const contract = () =>
      coreEntry
        .contract()
        .then((loadedContract) => assertContractIdMatchesToolId(toolId, loadedContract));

    map[toolId] = {
      ...coreEntry,
      component,
      contract,
    };
  }

  for (const toolId of Object.keys(coreRegistry)) {
    if (!TOOL_COMPONENT_LOADERS[toolId]) {
      throw new Error(
        \`Core registry entry declared without component loader for tool id: \${toolId}\`,
      );
    }
  }

  return map;
}

export const TOOL_REGISTRY_MAP: Record<string, ToolRegistryEntry> = buildToolRegistryMap();

export const TOOL_COMPONENT_MAP: Record<string, () => Promise<Type<unknown>>> = Object.fromEntries(
  Object.entries(TOOL_REGISTRY_MAP).map(([id, entry]) => [id, entry.component]),
);

export function getToolComponent(id: string): (() => Promise<Type<unknown>>) | null {
  return TOOL_REGISTRY_MAP[id]?.component || null;
}
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
