import type { Type } from '@angular/core';
import { contract } from './cron-explainer.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./cron-explainer.component').then((m) => m.CronExplainerComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./cron-explainer.kernel');
}
