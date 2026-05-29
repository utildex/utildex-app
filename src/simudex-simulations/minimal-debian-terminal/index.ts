import type { Type } from '@angular/core';
import { contract } from './minimal-debian-terminal.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./minimal-debian-terminal.component').then(
    (module) => module.MinimalDebianTerminalComponent,
  );
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./minimal-debian-terminal.kernel');
}
