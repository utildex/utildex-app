import type { Type } from '@angular/core';
import { contract } from './json-formatter.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./json-formatter.component').then((m) => m.JsonFormatterComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./json-formatter.kernel');
}
