import type { Type } from '@angular/core';
import { contract } from './compress-pdf.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./compress-pdf.component').then((m) => m.CompressPdfComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./compress-pdf.kernel');
}
