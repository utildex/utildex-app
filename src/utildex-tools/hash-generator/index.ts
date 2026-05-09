import type { Type } from '@angular/core';
import { contract } from './hash-generator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./hash-generator.component').then((m) => m.HashGeneratorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./hash-generator.kernel');
}
