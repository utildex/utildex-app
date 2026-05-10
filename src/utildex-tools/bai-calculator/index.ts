import type { Type } from '@angular/core';
import { contract } from './bai-calculator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./bai-calculator.component').then((m) => m.BaiCalculatorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./bai-calculator.kernel');
}
