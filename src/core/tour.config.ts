import { InjectionToken } from '@angular/core';

export interface TourStep {
  id: string;
  route: string;
  i18nKey: string;
  i18nTitleKey?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string;
}

export const TOUR_STEPS = new InjectionToken<TourStep[]>('TOUR_STEPS');
