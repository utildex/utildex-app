import type { Type } from '@angular/core';
import { contract } from './bmi-calculator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./bmi-calculator.component').then((m) => m.BmiCalculatorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./bmi-calculator.kernel');
}
