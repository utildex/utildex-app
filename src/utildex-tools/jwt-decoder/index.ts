import type { Type } from '@angular/core';
import { contract } from './jwt-decoder.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./jwt-decoder.component').then((m) => m.JwtDecoderComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./jwt-decoder.kernel');
}
