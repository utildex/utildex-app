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

type ToolIndexLoader = () => Promise<ToolIndexModule>;

/**
 * Explicit loader map avoids relying on bundler-specific glob transforms.
 * This keeps tool discovery stable across dev/build targets (including Cloudflare Pages).
 */
const TOOL_INDEX_LOADERS: Record<string, ToolIndexLoader> = {
  'base64-encoder-decoder': () => import('../tools/base64-encoder-decoder/index'),
  'code-snippet-viewer': () => import('../tools/code-snippet-viewer/index'),
  'diff-checker': () => import('../tools/diff-checker/index'),
  'hash-generator': () => import('../tools/hash-generator/index'),
  'image-converter': () => import('../tools/image-converter/index'),
  'image-resizer': () => import('../tools/image-resizer/index'),
  'img-to-pdf': () => import('../tools/img-to-pdf/index'),
  'json-formatter': () => import('../tools/json-formatter/index'),
  'jwt-decoder': () => import('../tools/jwt-decoder/index'),
  'lorem-ipsum': () => import('../tools/lorem-ipsum/index'),
  'markdown-preview': () => import('../tools/markdown-preview/index'),
  'merge-pdf': () => import('../tools/merge-pdf/index'),
  'password-generator': () => import('../tools/password-generator/index'),
  'pdf-to-img': () => import('../tools/pdf-to-img/index'),
  'qr-studio': () => import('../tools/qr-studio/index'),
  'rotate-pdf': () => import('../tools/rotate-pdf/index'),
  'split-pdf': () => import('../tools/split-pdf/index'),
  'unit-converter': () => import('../tools/unit-converter/index'),
  'url-encoder-decoder': () => import('../tools/url-encoder-decoder/index'),
};

function buildToolRegistryMap(): Record<string, ToolRegistryEntry> {
  const map: Record<string, ToolRegistryEntry> = {};

  for (const [declaredId, loadIndex] of Object.entries(TOOL_INDEX_LOADERS)) {
    if (map[declaredId]) {
      throw new Error(`Duplicate tool id detected while building registry: ${declaredId}`);
    }

    map[declaredId] = {
      component: async () => {
        const mod = await loadIndex();
        return mod.loadComponent();
      },
      contract: async () => {
        const mod = await loadIndex();
        const contractId = mod.contract?.id;
        if (!contractId) {
          throw new Error(
            `Tool index module for ${declaredId} does not export a valid contract id.`,
          );
        }
        if (contractId !== declaredId) {
          throw new Error(
            `Tool index contract id mismatch: declared=${declaredId}, exported=${contractId}`,
          );
        }
        return mod.contract;
      },
      kernel: async () => {
        const mod = await loadIndex();
        return mod.loadKernel();
      },
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
