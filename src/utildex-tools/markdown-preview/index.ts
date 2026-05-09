import type { Type } from '@angular/core';
import { contract } from './markdown-preview.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./markdown-preview.component').then((m) => m.MarkdownPreviewComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./markdown-preview.kernel');
}
