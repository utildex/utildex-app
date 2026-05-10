import type { Type } from '@angular/core';
import { contract } from './date-time-calculator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./date-time-calculator.component').then((m) => m.DateTimeCalculatorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./date-time-calculator.kernel');
}
