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

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: 'tour-welcome',
    route: '/',
    i18nKey: 'TOUR_STEP_WELCOME',
    i18nTitleKey: 'TOUR_TITLE_WELCOME',
    position: 'center',
  },
  {
    id: 'tour-search',
    route: '/',
    i18nKey: 'TOUR_STEP_SEARCH',
    i18nTitleKey: 'TOUR_TITLE_SEARCH',
    position: 'bottom',
  },
  {
    id: 'tour-browse',
    route: '/',
    i18nKey: 'TOUR_STEP_BROWSE',
    i18nTitleKey: 'TOUR_TITLE_BROWSE',
    position: 'bottom',
  },
  {
    id: 'tour-filters',
    route: '/tools',
    i18nKey: 'TOUR_STEP_FILTERS',
    i18nTitleKey: 'TOUR_TITLE_FILTERS',
    position: 'bottom',
  },
  {
    id: 'tour-dashboard-edit',
    route: '/my-dashboard',
    i18nKey: 'TOUR_STEP_DASHBOARD',
    i18nTitleKey: 'TOUR_TITLE_DASHBOARD',
    position: 'bottom',
  },
  {
    id: 'tour-dashboard-add-widget',
    route: '/my-dashboard',
    i18nKey: 'TOUR_STEP_DASHBOARD_ADD_WIDGET',
    i18nTitleKey: 'TOUR_TITLE_DASHBOARD_ADD_WIDGET',
    position: 'bottom',
  },
  {
    id: 'tour-dashboard-add-filler',
    route: '/my-dashboard',
    i18nKey: 'TOUR_STEP_DASHBOARD_ADD_FILLER',
    i18nTitleKey: 'TOUR_TITLE_DASHBOARD_ADD_FILLER',
    position: 'bottom',
  },
  {
    id: 'tour-history',
    route: '/my-dashboard',
    i18nKey: 'TOUR_STEP_HISTORY',
    i18nTitleKey: 'TOUR_TITLE_HISTORY',
    position: 'left',
  },
  {
    id: 'tour-settings-open',
    route: '/my-dashboard',
    i18nKey: 'TOUR_STEP_SETTINGS_OPEN',
    i18nTitleKey: 'TOUR_TITLE_SETTINGS_OPEN',
    position: 'bottom',
  },
  {
    id: 'tour-settings-general',
    route: '/my-dashboard',
    i18nKey: 'TOUR_STEP_SETTINGS_GENERAL',
    i18nTitleKey: 'TOUR_TITLE_SETTINGS_GENERAL',
    position: 'bottom',
    action: 'open-settings',
  },
  {
    id: 'tour-settings-data',
    route: '/my-dashboard',
    i18nKey: 'TOUR_STEP_SETTINGS_DATA',
    i18nTitleKey: 'TOUR_TITLE_SETTINGS_DATA',
    position: 'bottom',
    action: 'open-settings',
  },
  {
    id: 'tour-settings-reset',
    route: '/my-dashboard',
    i18nKey: 'TOUR_STEP_SETTINGS_RESET',
    i18nTitleKey: 'TOUR_TITLE_SETTINGS_RESET',
    position: 'top',
    action: 'open-settings',
  },
  {
    id: 'tour-blog',
    route: '/articles',
    i18nKey: 'TOUR_STEP_BLOG',
    i18nTitleKey: 'TOUR_TITLE_BLOG',
    position: 'top',
    action: 'close-settings',
  },
];
