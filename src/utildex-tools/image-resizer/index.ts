import type { Type } from '@angular/core';
import { contract } from './image-resizer.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./image-resizer.component').then((m) => m.ImageResizerComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./image-resizer.kernel');
}
