import type { Type } from '@angular/core';
import { contract } from './homa-calculator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./homa-calculator.component').then((m) => m.HomaCalculatorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./homa-calculator.kernel');
}
