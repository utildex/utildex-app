import type { Type } from '@angular/core';
import { contract } from './image-converter.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./image-converter.component').then((m) => m.ImageConverterComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./image-converter.kernel');
}
