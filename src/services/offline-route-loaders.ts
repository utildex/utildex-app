export const OFFLINE_ROUTE_LOADERS: Array<() => Promise<unknown>> = [
  () => import('../pages/legal/legal.component'),
  () => import('../pages/terms/terms.component'),
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
