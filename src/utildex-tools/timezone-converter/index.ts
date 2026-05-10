import type { Type } from '@angular/core';
import { contract } from './timezone-converter.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./timezone-converter.component').then((m) => m.TimezoneConverterComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./timezone-converter.kernel');
}
