import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
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
    path: 'history',
    loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent),
    title: 'History - Utildex'
  },
  {
    path: 'tools/lorem-ipsum',
    loadComponent: () => import('./tools/lorem-ipsum/lorem-ipsum.component').then(m => m.LoremIpsumComponent),
    title: 'Lorem Ipsum - Utildex'
  },
  {
    path: 'tools/password-generator',
    loadComponent: () => import('./tools/password-generator/password-generator.component').then(m => m.PasswordGeneratorComponent),
    title: 'Password Gen - Utildex'
  },
  {
    path: 'tools/markdown-preview',
    loadComponent: () => import('./tools/markdown-preview/markdown-preview.component').then(m => m.MarkdownPreviewComponent),
    title: 'Markdown - Utildex'
  },
  {
    path: 'tools/json-formatter',
    loadComponent: () => import('./tools/json-formatter/json-formatter.component').then(m => m.JsonFormatterComponent),
    title: 'JSON Formatter - Utildex'
  },
  {
    path: 'tools/unit-converter',
    loadComponent: () => import('./tools/unit-converter/unit-converter.component').then(m => m.UnitConverterComponent),
    title: 'Unit Converter - Utildex'
  },
  {
    path: '**',
    redirectTo: ''
  }
];