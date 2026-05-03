/**
 * Synedex Tool Registry (games are treated as tools).
 */

import { Type } from '@angular/core';
import { ToolContract } from './tool-contract';
import { getCoreRegistryForApp } from './core-registry';
import { getAppId } from './app.config';

export interface ToolRegistryEntry {
  component: () => Promise<Type<unknown>>;
  contract: () => Promise<ToolContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

type ComponentLoader = () => Promise<Type<unknown>>;

const TOOL_COMPONENT_LOADERS: Record<string, ComponentLoader> = {
  'ufov-training': () =>
    import('../synedex-games/ufov-training/ufov-training.component').then(
      (m) => m.UfovTrainingComponent,
    ),
};

function assertContractIdMatchesToolId(toolId: string, contract: ToolContract): ToolContract {
  if (contract.id !== toolId) {
    throw new Error(
      `Tool contract id mismatch for registry key "${toolId}": loaded contract.id="${contract.id}"`,
    );
  }

  return contract;
}

function buildToolRegistryMap(): Record<string, ToolRegistryEntry> {
  const map: Record<string, ToolRegistryEntry> = {};
  const coreRegistry = getCoreRegistryForApp(getAppId());

  for (const [toolId, coreEntry] of Object.entries(coreRegistry)) {
    if (map[toolId]) {
      throw new Error(`Duplicate tool id detected while building registry: ${toolId}`);
    }

    const component = TOOL_COMPONENT_LOADERS[toolId];
    if (!component) {
      throw new Error(`Missing Angular component loader for tool id: ${toolId}`);
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
        `Core registry entry declared without component loader for tool id: ${toolId}`,
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
