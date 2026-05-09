import { getAppId } from '../core/app.config';

export const OFFLINE_ROUTE_LOADERS: Array<() => Promise<unknown>> = (() => {
  const appId = getAppId();
  const commonRoutes = [
    () => import('../pages/legal/legal.component'),
    () => import('../pages/terms/terms.component'),
  ];

  if (appId === 'synedex') {
    return [...commonRoutes, () => import('../pages/synedex-welcome/synedex-welcome.component')];
  }

  // Utildex routes
  return [
    ...commonRoutes,
    () => import('../pages/user-dashboard/user-dashboard.component'),
    () => import('../pages/categories/categories.component'),
    () => import('../pages/category-detail/category-detail.component'),
    () => import('../pages/history/history.component'),
    () => import('../pages/privacy/privacy.component'),
    () => import('../pages/all-tools/all-tools.component'),
    () => import('../pages/tool-host/tool-host.component'),
    () => import('../pages/tool-spaces/tool-spaces.component'),
    () => import('../pages/tool-space-host/tool-space-host.component'),
  ];
})();
