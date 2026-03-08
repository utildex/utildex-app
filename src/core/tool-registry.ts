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

export const TOOL_REGISTRY_MAP: Record<string, ToolRegistryEntry> = {
  'lorem-ipsum': {
    component: () =>
      import('../tools/lorem-ipsum/lorem-ipsum.component').then((m) => m.LoremIpsumComponent),
    contract: () => import('../tools/lorem-ipsum/lorem-ipsum.contract').then((m) => m.contract),
    kernel: () => import('../tools/lorem-ipsum/lorem-ipsum.kernel'),
  },
  'password-generator': {
    component: () =>
      import('../tools/password-generator/password-generator.component').then(
        (m) => m.PasswordGeneratorComponent,
      ),
    contract: () =>
      import('../tools/password-generator/password-generator.contract').then((m) => m.contract),
    kernel: () => import('../tools/password-generator/password-generator.kernel'),
  },
  'json-formatter': {
    component: () =>
      import('../tools/json-formatter/json-formatter.component').then(
        (m) => m.JsonFormatterComponent,
      ),
    contract: () =>
      import('../tools/json-formatter/json-formatter.contract').then((m) => m.contract),
    kernel: () => import('../tools/json-formatter/json-formatter.kernel'),
  },
  'qr-studio': {
    component: () =>
      import('../tools/qr-studio/qr-studio.component').then((m) => m.QrStudioComponent),
    contract: () => import('../tools/qr-studio/qr-studio.contract').then((m) => m.contract),
    kernel: () => import('../tools/qr-studio/qr-studio.kernel'),
  },
  'img-to-pdf': {
    component: () =>
      import('../tools/img-to-pdf/img-to-pdf.component').then((m) => m.ImgToPdfComponent),
    contract: () => import('../tools/img-to-pdf/img-to-pdf.contract').then((m) => m.contract),
    kernel: () => import('../tools/img-to-pdf/img-to-pdf.kernel'),
  },
  'diff-checker': {
    component: () =>
      import('../tools/diff-checker/diff-checker.component').then((m) => m.DiffCheckerComponent),
    contract: () => import('../tools/diff-checker/diff-checker.contract').then((m) => m.contract),
    kernel: () => import('../tools/diff-checker/diff-checker.kernel'),
  },
  'unit-converter': {
    component: () =>
      import('../tools/unit-converter/unit-converter.component').then(
        (m) => m.UnitConverterComponent,
      ),
    contract: () =>
      import('../tools/unit-converter/unit-converter.contract').then((m) => m.contract),
    kernel: () => import('../tools/unit-converter/unit-converter.kernel'),
  },
  'hash-generator': {
    component: () =>
      import('../tools/hash-generator/hash-generator.component').then(
        (m) => m.HashGeneratorComponent,
      ),
    contract: () =>
      import('../tools/hash-generator/hash-generator.contract').then((m) => m.contract),
    kernel: () => import('../tools/hash-generator/hash-generator.kernel'),
  },
  'markdown-preview': {
    component: () =>
      import('../tools/markdown-preview/markdown-preview.component').then(
        (m) => m.MarkdownPreviewComponent,
      ),
    contract: () =>
      import('../tools/markdown-preview/markdown-preview.contract').then((m) => m.contract),
    kernel: () => import('../tools/markdown-preview/markdown-preview.kernel'),
  },
  'split-pdf': {
    component: () =>
      import('../tools/split-pdf/split-pdf.component').then((m) => m.SplitPdfComponent),
    contract: () => import('../tools/split-pdf/split-pdf.contract').then((m) => m.contract),
    kernel: () => import('../tools/split-pdf/split-pdf.kernel'),
  },
  'merge-pdf': {
    component: () =>
      import('../tools/merge-pdf/merge-pdf.component').then((m) => m.MergePdfComponent),
    contract: () => import('../tools/merge-pdf/merge-pdf.contract').then((m) => m.contract),
    kernel: () => import('../tools/merge-pdf/merge-pdf.kernel'),
  },
  'rotate-pdf': {
    component: () =>
      import('../tools/rotate-pdf/rotate-pdf.component').then((m) => m.RotatePdfComponent),
    contract: () => import('../tools/rotate-pdf/rotate-pdf.contract').then((m) => m.contract),
    kernel: () => import('../tools/rotate-pdf/rotate-pdf.kernel'),
  },
  'pdf-to-img': {
    component: () =>
      import('../tools/pdf-to-img/pdf-to-img.component').then((m) => m.PdfToImgComponent),
    contract: () => import('../tools/pdf-to-img/pdf-to-img.contract').then((m) => m.contract),
    kernel: () => import('../tools/pdf-to-img/pdf-to-img.kernel'),
  },
  'image-converter': {
    component: () =>
      import('../tools/image-converter/image-converter.component').then(
        (m) => m.ImageConverterComponent,
      ),
    contract: () =>
      import('../tools/image-converter/image-converter.contract').then((m) => m.contract),
    kernel: () => import('../tools/image-converter/image-converter.kernel'),
  },
  'image-resizer': {
    component: () =>
      import('../tools/image-resizer/image-resizer.component').then((m) => m.ImageResizerComponent),
    contract: () => import('../tools/image-resizer/image-resizer.contract').then((m) => m.contract),
    kernel: () => import('../tools/image-resizer/image-resizer.kernel'),
  },
};

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
