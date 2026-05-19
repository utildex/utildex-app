export const OFFLINE_ROUTE_LOADERS: Array<() => Promise<unknown>> = [
  () => import('../pages/simudex-welcome/simudex-welcome.component'),
  () => import('../pages/legal/legal.component'),
  () => import('../pages/terms/terms.component'),
  () => import('../pages/privacy/privacy.component'),
  () => import('../pages/all-tools/all-tools.component'),
  () => import('../pages/tool-host/tool-host.component'),
];
