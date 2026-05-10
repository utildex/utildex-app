import type { Type } from '@angular/core';
import { contract } from './timestamp-converter.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./timestamp-converter.component').then((m) => m.TimestampConverterComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./timestamp-converter.kernel');
}
