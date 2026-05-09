import type { Type } from '@angular/core';
import { contract } from './rotate-pdf.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./rotate-pdf.component').then((m) => m.RotatePdfComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./rotate-pdf.kernel');
}
