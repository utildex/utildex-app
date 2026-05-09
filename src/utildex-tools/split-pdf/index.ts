import type { Type } from '@angular/core';
import { contract } from './split-pdf.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./split-pdf.component').then((m) => m.SplitPdfComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./split-pdf.kernel');
}
