
import { Routes } from '@angular/router';
import { isDevMode } from '@angular/core';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'my-dashboard',
    loadComponent: () => import('./pages/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent),
    title: 'My Dashboard - Utildex'
  },
  {
    path: 'categories',
    loadComponent: () => import('./pages/categories/categories.component').then(m => m.CategoriesComponent),
    title: 'Categories - Utildex'
  },
  {
    path: 'categories/:id',
    loadComponent: () => import('./pages/category-detail/category-detail.component').then(m => m.CategoryDetailComponent),
    title: 'Category - Utildex'
  },
  {
    path: 'tools',
    loadComponent: () => import('./pages/all-tools/all-tools.component').then(m => m.AllToolsComponent),
    title: 'All Tools - Utildex'
  },
  {
    path: 'articles',
    loadComponent: () => import('./pages/articles/articles.component').then(m => m.ArticlesComponent),
    title: 'Blog - Utildex'
  },
  {
    path: 'articles/:id',
    loadComponent: () => import('./pages/article-reader/article-reader.component').then(m => m.ArticleReaderComponent),
    title: 'Reader - Utildex'
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent),
    title: 'History - Utildex'
  },
  // Dev-Only Banner Generator
  {
    path: 'preview-banner',
    loadComponent: () => import('./pages/preview-banner/preview-banner.component').then(m => m.PreviewBannerComponent),
    canMatch: [() => isDevMode()],
    title: 'Banner Generator'
  },
  // Dynamic Tool Route
  {
    path: 'tools/:id',
    loadComponent: () => import('./pages/tool-host/tool-host.component').then(m => m.ToolHostComponent)
    // Title is handled dynamically by SeoService
  },
  {
    path: '**',
    redirectTo: ''
  }
];
