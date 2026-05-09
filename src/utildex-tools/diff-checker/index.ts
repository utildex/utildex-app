import type { Type } from '@angular/core';
import { contract } from './diff-checker.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./diff-checker.component').then((m) => m.DiffCheckerComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./diff-checker.kernel');
}
