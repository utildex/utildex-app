import type { Type } from '@angular/core';
import { contract } from './merge-pdf.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./merge-pdf.component').then((m) => m.MergePdfComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./merge-pdf.kernel');
}
