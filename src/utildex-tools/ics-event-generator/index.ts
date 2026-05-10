import type { Type } from '@angular/core';
import { contract } from './ics-event-generator.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./ics-event-generator.component').then((m) => m.IcsEventGeneratorComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./ics-event-generator.kernel');
}
