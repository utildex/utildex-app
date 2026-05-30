import type { Type } from '@angular/core';
import { contract } from './mental-math.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./mental-math.component').then((module) => module.MentalMathComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./mental-math.kernel');
}
