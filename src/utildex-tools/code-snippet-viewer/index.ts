import type { Type } from '@angular/core';
import { contract } from './code-snippet-viewer.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./code-snippet-viewer.component').then((m) => m.CodeSnippetViewerComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./code-snippet-viewer.kernel');
}
