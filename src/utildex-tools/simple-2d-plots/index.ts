import type { Type } from '@angular/core';
import { contract } from './simple-2d-plots.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./simple-2d-plots.component').then((m) => m.Simple2dPlotsComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./simple-2d-plots.kernel');
}
