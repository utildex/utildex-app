
import { Routes } from '@angular/router';
import { isDevMode, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { languageGuard } from './core/guards/language.guard';

export const routes: Routes = [
  // 1. Root Rerouter: If user hits root '/', send to their preferred language '/en/', '/fr/' etc.
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
        const platformId = inject(PLATFORM_ID);
        // Ensure we're in the browser before accessing navigator
        if (isPlatformBrowser(platformId)) {
            const browserLang = navigator.language.split('-')[0];
            const supportedLangs = ['en', 'fr', 'es', 'zh'];
            if (supportedLangs.includes(browserLang)) {
                return browserLang;
            }
        }
        return 'en';
    },
    resolve: {
    }
  },
  
  // 2. The Language Wrapper
  {
    path: ':lang',
    canMatch: [languageGuard], // Ensures :lang is one of 'en', 'fr', etc.
    children: [
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
    ]
  },

  // 3. Fallback: If URL doesn't match a language (e.g. /tools/pdf-split without language), redirect to English
  // This catches legacy links from before the migration
  {
    path: '**',
    redirectTo: 'en'
  }
];
