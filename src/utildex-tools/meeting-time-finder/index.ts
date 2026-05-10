import type { Type } from '@angular/core';
import { contract } from './meeting-time-finder.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./meeting-time-finder.component').then((m) => m.MeetingTimeFinderComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./meeting-time-finder.kernel');
}
