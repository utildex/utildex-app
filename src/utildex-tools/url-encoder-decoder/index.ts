import type { Type } from '@angular/core';
import { contract } from './url-encoder-decoder.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./url-encoder-decoder.component').then((m) => m.UrlEncoderDecoderComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./url-encoder-decoder.kernel');
}
