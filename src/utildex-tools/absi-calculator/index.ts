import type { Type } from '@angular/core';
import { contract } from './absi-calculator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./absi-calculator.component').then((m) => m.AbsiCalculatorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./absi-calculator.kernel');
}
