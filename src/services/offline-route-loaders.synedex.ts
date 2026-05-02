export const OFFLINE_ROUTE_LOADERS: Array<() => Promise<unknown>> = [
  () => import('../pages/synedex-welcome/synedex-welcome.component'),
  () => import('../pages/categories/categories.component'),
  () => import('../pages/category-detail/category-detail.component'),
  () => import('../pages/articles/articles.component'),
  () => import('../pages/article-reader/article-reader.component'),
  () => import('../pages/legal/legal.component'),
  () => import('../pages/terms/terms.component'),
  () => import('../pages/all-tools/all-tools.component'),
  () => import('../pages/tool-host/tool-host.component'),
];
