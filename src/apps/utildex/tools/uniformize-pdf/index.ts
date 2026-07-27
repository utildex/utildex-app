import type { Type } from '@angular/core';
import { contract } from './uniformize-pdf.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./uniformize-pdf.component').then((m) => m.UniformizePdfComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./uniformize-pdf.kernel');
}
