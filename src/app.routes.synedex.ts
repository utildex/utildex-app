import { Routes } from '@angular/router';
import { isDevMode, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { languageGuard } from './core/guards/language.guard';
import { I18nService } from './services/i18n.service';

/**
 * Synedex-only route manifest.
 *
 * Keep this list intentionally small to avoid shipping Utildex-only pages.
 * Add or remove entries here to control what goes into the Synedex bundle.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const platformId = inject(PLATFORM_ID);
      const i18n = inject(I18nService);

      if (isPlatformBrowser(platformId)) {
        return i18n.getStartupLanguage();
      }
      return 'en';
    },
    resolve: {},
  },
  {
    path: ':lang',
    canMatch: [languageGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/synedex-welcome/synedex-welcome.component').then(
            (m) => m.SynedexWelcomeComponent,
          ),
        title: 'Synedex - Mental Games',
      },
      {
        path: 'games',
        loadComponent: () =>
          import('./pages/all-tools/all-tools.component').then((m) => m.AllToolsComponent),
        title: 'All Games - Synedex',
      },
      {
        path: 'games/:id',
        loadComponent: () =>
          import('./pages/tool-host/tool-host.component').then((m) => m.ToolHostComponent),
        // Title handled by SeoService
      },
      {
        path: 'legal',
        loadComponent: () => import('./pages/legal/legal.component').then((m) => m.LegalComponent),
        title: 'Legal Notice - Synedex',
      },
      {
        path: 'terms',
        loadComponent: () => import('./pages/terms/terms.component').then((m) => m.TermsComponent),
        title: 'Terms of Use - Synedex',
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/categories/categories.component').then((m) => m.CategoriesComponent),
        title: 'Categories - Synedex',
      },
      {
        path: 'categories/:id',
        loadComponent: () =>
          import('./pages/category-detail/category-detail.component').then(
            (m) => m.CategoryDetailComponent,
          ),
        title: 'Category - Synedex',
      },
      {
        path: 'articles',
        loadComponent: () =>
          import('./pages/articles/articles.component').then((m) => m.ArticlesComponent),
        title: 'Articles - Synedex',
      },
      {
        path: 'articles/:id',
        loadComponent: () =>
          import('./pages/article-reader/article-reader.component').then(
            (m) => m.ArticleReaderComponent,
          ),
        title: 'Reader - Synedex',
      },
      {
        path: 'preview-banner',
        loadComponent: () =>
          import('./pages/preview-banner/preview-banner.component').then(
            (m) => m.PreviewBannerComponent,
          ),
        canMatch: [() => isDevMode()],
        title: 'Banner Generator',
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'en',
  },
];
