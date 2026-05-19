import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { isDevMode, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { languageGuard } from './core/guards/language.guard';
import { I18nService } from './services/i18n.service';
import { type Language } from './data/languages';

function isLanguage(value: string): value is Language {
  return value === 'en' || value === 'fr' || value === 'es' || value === 'zh';
}

function routeLang(route: ActivatedRouteSnapshot): Language {
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    const lang = current.paramMap.get('lang');
    if (lang && isLanguage(lang)) return lang;
    current = current.parent;
  }
  return 'en';
}

function localizedTitle(titles: Record<Language, string>) {
  return (route: ActivatedRouteSnapshot): string => titles[routeLang(route)] ?? titles.en;
}

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
          import('./pages/simudex-welcome/simudex-welcome.component').then(
            (m) => m.SimudexWelcomeComponent,
          ),
        title: localizedTitle({
          en: 'Simudex - Simulation Library',
          fr: 'Simudex - Bibliotheque de simulation',
          es: 'Simudex - Biblioteca de simulacion',
          zh: 'Simudex - 仿真库',
        }),
      },
      {
        path: 'simulations',
        loadComponent: () =>
          import('./pages/all-tools/all-tools.component').then((m) => m.AllToolsComponent),
        title: localizedTitle({
          en: 'All Simulations - Simudex',
          fr: 'Toutes les simulations - Simudex',
          es: 'Todas las simulaciones - Simudex',
          zh: '全部仿真 - Simudex',
        }),
      },
      {
        path: 'simulations/:id',
        loadComponent: () =>
          import('./pages/tool-host/tool-host.component').then((m) => m.ToolHostComponent),
      },
      {
        path: 'legal',
        loadComponent: () => import('./pages/legal/legal.component').then((m) => m.LegalComponent),
        title: localizedTitle({
          en: 'Legal Notice - Simudex',
          fr: 'Mentions legales - Simudex',
          es: 'Aviso legal - Simudex',
          zh: '法律声明 - Simudex',
        }),
      },
      {
        path: 'terms',
        loadComponent: () => import('./pages/terms/terms.component').then((m) => m.TermsComponent),
        title: localizedTitle({
          en: 'Terms of Use - Simudex',
          fr: "Conditions d'utilisation - Simudex",
          es: 'Terminos de uso - Simudex',
          zh: '使用条款 - Simudex',
        }),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./pages/privacy/privacy.component').then((m) => m.PrivacyComponent),
        title: localizedTitle({
          en: 'Privacy Policy - Simudex',
          fr: 'Politique de confidentialite - Simudex',
          es: 'Politica de privacidad - Simudex',
          zh: '隐私政策 - Simudex',
        }),
      },
      {
        path: 'preview-banner',
        loadComponent: () =>
          import('./pages/preview-banner/preview-banner.component').then(
            (m) => m.PreviewBannerComponent,
          ),
        canMatch: [() => isDevMode()],
        title: localizedTitle({
          en: 'Banner Generator',
          fr: 'Generateur de bannieres',
          es: 'Generador de banners',
          zh: '横幅生成器',
        }),
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
