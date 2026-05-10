import type { Type } from '@angular/core';
import { contract } from './body-fat-deurenberg.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./body-fat-deurenberg.component').then((m) => m.BodyFatDeurenbergComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./body-fat-deurenberg.kernel');
}
