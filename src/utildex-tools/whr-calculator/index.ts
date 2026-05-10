import type { Type } from '@angular/core';
import { contract } from './whr-calculator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./whr-calculator.component').then((m) => m.WhrCalculatorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./whr-calculator.kernel');
}
