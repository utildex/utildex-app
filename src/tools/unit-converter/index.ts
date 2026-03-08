import type { Type } from '@angular/core';
import { contract } from './unit-converter.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./unit-converter.component').then((m) => m.UnitConverterComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./unit-converter.kernel');
}
