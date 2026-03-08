import type { Type } from '@angular/core';
import { contract } from './lorem-ipsum.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./lorem-ipsum.component').then((m) => m.LoremIpsumComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./lorem-ipsum.kernel');
}
