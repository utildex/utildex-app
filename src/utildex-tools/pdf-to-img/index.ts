import type { Type } from '@angular/core';
import { contract } from './pdf-to-img.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./pdf-to-img.component').then((m) => m.PdfToImgComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./pdf-to-img.kernel');
}
