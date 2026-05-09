import type { Type } from '@angular/core';
import { contract } from './img-to-pdf.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./img-to-pdf.component').then((m) => m.ImgToPdfComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./img-to-pdf.kernel');
}
