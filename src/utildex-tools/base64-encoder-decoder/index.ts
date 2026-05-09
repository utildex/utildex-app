import type { Type } from '@angular/core';
import { contract } from './base64-encoder-decoder.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./base64-encoder-decoder.component').then((m) => m.Base64EncoderDecoderComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./base64-encoder-decoder.kernel');
}
