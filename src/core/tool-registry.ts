/**
 * Tool Registry — maps tool IDs to their component, contract, and kernel.
 */

import { Type } from '@angular/core';
import { ToolContract } from './tool-contract';
import { CORE_REGISTRY } from './core-registry';

export interface ToolRegistryEntry {
  /** Lazy loader for the Angular component (UI layer). */
  component: () => Promise<Type<unknown>>;
  /** Lazy loader for the tool contract (metadata + type contract). */
  contract: () => Promise<ToolContract>;
  /** Lazy loader for the kernel (pure transformation logic). */
  kernel: () => Promise<Record<string, unknown>>;
}

type ComponentLoader = () => Promise<Type<unknown>>;

const TOOL_COMPONENT_LOADERS: Record<string, ComponentLoader> = {
  'base64-encoder-decoder': () =>
    import('../tools/base64-encoder-decoder/base64-encoder-decoder.component').then(
      (m) => m.Base64EncoderDecoderComponent,
    ),
  'code-snippet-viewer': () =>
    import('../tools/code-snippet-viewer/code-snippet-viewer.component').then(
      (m) => m.CodeSnippetViewerComponent,
    ),
  'diff-checker': () =>
    import('../tools/diff-checker/diff-checker.component').then((m) => m.DiffCheckerComponent),
  'hash-generator': () =>
    import('../tools/hash-generator/hash-generator.component').then(
      (m) => m.HashGeneratorComponent,
    ),
  'image-converter': () =>
    import('../tools/image-converter/image-converter.component').then(
      (m) => m.ImageConverterComponent,
    ),
  'image-resizer': () =>
    import('../tools/image-resizer/image-resizer.component').then((m) => m.ImageResizerComponent),
  'img-to-pdf': () =>
    import('../tools/img-to-pdf/img-to-pdf.component').then((m) => m.ImgToPdfComponent),
  'json-formatter': () =>
    import('../tools/json-formatter/json-formatter.component').then(
      (m) => m.JsonFormatterComponent,
    ),
  'jwt-decoder': () =>
    import('../tools/jwt-decoder/jwt-decoder.component').then((m) => m.JwtDecoderComponent),
  'lorem-ipsum': () =>
    import('../tools/lorem-ipsum/lorem-ipsum.component').then((m) => m.LoremIpsumComponent),
  'markdown-preview': () =>
    import('../tools/markdown-preview/markdown-preview.component').then(
      (m) => m.MarkdownPreviewComponent,
    ),
  'merge-pdf': () =>
    import('../tools/merge-pdf/merge-pdf.component').then((m) => m.MergePdfComponent),
  'password-generator': () =>
    import('../tools/password-generator/password-generator.component').then(
      (m) => m.PasswordGeneratorComponent,
    ),
  'pdf-to-img': () =>
    import('../tools/pdf-to-img/pdf-to-img.component').then((m) => m.PdfToImgComponent),
  'qr-studio': () =>
    import('../tools/qr-studio/qr-studio.component').then((m) => m.QrStudioComponent),
  'rotate-pdf': () =>
    import('../tools/rotate-pdf/rotate-pdf.component').then((m) => m.RotatePdfComponent),
  'simple-2d-plots': () =>
    import('../tools/simple-2d-plots/simple-2d-plots.component').then(
      (m) => m.Simple2dPlotsComponent,
    ),
  'split-pdf': () =>
    import('../tools/split-pdf/split-pdf.component').then((m) => m.SplitPdfComponent),
  'unit-converter': () =>
    import('../tools/unit-converter/unit-converter.component').then(
      (m) => m.UnitConverterComponent,
    ),
  'url-encoder-decoder': () =>
    import('../tools/url-encoder-decoder/url-encoder-decoder.component').then(
      (m) => m.UrlEncoderDecoderComponent,
    ),
};

function buildToolRegistryMap(): Record<string, ToolRegistryEntry> {
  const map: Record<string, ToolRegistryEntry> = {};

  for (const [toolId, coreEntry] of Object.entries(CORE_REGISTRY)) {
    if (map[toolId]) {
      throw new Error(`Duplicate tool id detected while building registry: ${toolId}`);
    }

    const component = TOOL_COMPONENT_LOADERS[toolId];
    if (!component) {
      throw new Error(`Missing Angular component loader for tool id: ${toolId}`);
    }

    map[toolId] = {
      ...coreEntry,
      component,
    };
  }

  for (const toolId of Object.keys(TOOL_COMPONENT_LOADERS)) {
    if (!CORE_REGISTRY[toolId]) {
      throw new Error(`Component loader declared for unknown tool id: ${toolId}`);
    }
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
