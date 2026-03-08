/**
 * Tool Registry — maps tool IDs to their component, contract, and kernel.
 */

import { Type } from '@angular/core';
import { ToolContract } from './tool-contract';

export interface ToolRegistryEntry {
  /** Lazy loader for the Angular component (UI layer). */
  component: () => Promise<Type<unknown>>;
  /** Lazy loader for the tool contract (metadata + type contract). */
  contract: () => Promise<ToolContract>;
  /** Lazy loader for the kernel (pure transformation logic). */
  kernel: () => Promise<Record<string, unknown>>;
}

interface ToolIndexModule {
  contract: ToolContract;
  loadComponent: () => Promise<Type<unknown>>;
  loadKernel: () => Promise<Record<string, unknown>>;
}

const toolIndexModules = (
  import.meta as unknown as {
    glob: <T>(pattern: string, options: { eager: true }) => Record<string, T>;
  }
).glob<ToolIndexModule>('../tools/*/index.ts', {
  eager: true,
}) as Record<string, ToolIndexModule>;

function buildToolRegistryMap(): Record<string, ToolRegistryEntry> {
  const map: Record<string, ToolRegistryEntry> = {};

  for (const [modulePath, mod] of Object.entries(toolIndexModules)) {
    const id = mod.contract?.id;
    if (!id) {
      throw new Error(`Tool index module ${modulePath} does not export a valid contract id.`);
    }
    if (map[id]) {
      throw new Error(`Duplicate tool id detected while building registry: ${id}`);
    }

    map[id] = {
      component: mod.loadComponent,
      contract: async () => mod.contract,
      kernel: mod.loadKernel,
    };
  }

  return map;
}

export const TOOL_REGISTRY_MAP: Record<string, ToolRegistryEntry> = buildToolRegistryMap();

/**
 * Backward-compatible map: toolId → component loader.
 * Used by existing code that only needs component resolution.
 */
export const TOOL_COMPONENT_MAP: Record<string, () => Promise<Type<unknown>>> = Object.fromEntries(
  Object.entries(TOOL_REGISTRY_MAP).map(([id, entry]) => [id, entry.component]),
);

export function getToolComponent(id: string): (() => Promise<Type<unknown>>) | null {
  return TOOL_REGISTRY_MAP[id]?.component || null;
}
