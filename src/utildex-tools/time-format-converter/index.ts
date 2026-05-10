import type { Type } from '@angular/core';
import { contract } from './time-format-converter.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./time-format-converter.component').then((m) => m.TimeFormatConverterComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./time-format-converter.kernel');
}
