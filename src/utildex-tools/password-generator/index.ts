import type { Type } from '@angular/core';
import { contract } from './password-generator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./password-generator.component').then((m) => m.PasswordGeneratorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./password-generator.kernel');
}
