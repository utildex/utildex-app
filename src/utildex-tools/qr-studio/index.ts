import type { Type } from '@angular/core';
import { contract } from './qr-studio.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./qr-studio.component').then((m) => m.QrStudioComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./qr-studio.kernel');
}
