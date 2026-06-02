import { escapeSingleQuoted, moduleNoun, pascalCase } from '../common';
import type { AppScaffoldOptions } from '../types';

export function routesTemplate(options: AppScaffoldOptions): string {
  const welcomeClass = `${pascalCase(options.id)}WelcomeComponent`;
  return `import { Routes } from '@angular/router';
import { isDevMode, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { languageGuard } from '../../core/guards/language.guard';
import { I18nService } from '../../services/i18n.service';

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
          import('../../pages/${options.id}-welcome/${options.id}-welcome.component').then(
            (m) => m.${welcomeClass},
          ),
        title: '${escapeSingleQuoted(options.name)}',
      },
      {
        path: '${options.route}',
        loadComponent: () =>
          import('../../pages/all-tools/all-tools.component').then((m) => m.AllToolsComponent),
        title: '${escapeSingleQuoted(options.name)} Modules',
      },
      {
        path: '${options.route}/:id',
        loadComponent: () =>
          import('../../pages/tool-host/tool-host.component').then((m) => m.ToolHostComponent),
      },
      {
        path: 'legal',
        loadComponent: () =>
          import('../../pages/legal/legal.component').then((m) => m.LegalComponent),
        title: 'Legal Notice - ${escapeSingleQuoted(options.name)}',
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('../../pages/terms/terms.component').then((m) => m.TermsComponent),
        title: 'Terms of Use - ${escapeSingleQuoted(options.name)}',
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('../../pages/privacy/privacy.component').then((m) => m.PrivacyComponent),
        title: 'Privacy Policy - ${escapeSingleQuoted(options.name)}',
      },
      {
        path: 'preview-banner',
        loadComponent: () =>
          import('../../pages/preview-banner/preview-banner.component').then(
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
`;
}

export function welcomeComponentTemplate(options: AppScaffoldOptions): string {
  const className = `${pascalCase(options.id)}WelcomeComponent`;
  return `import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppConfigService } from '../../services/app-config.service';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';

@Component({
  selector: 'app-${options.id}-welcome',
  standalone: true,
  imports: [RouterLink, LocalLinkPipe],
  template: \`
    <section class="grid min-h-[calc(100vh-8rem)] content-center gap-6 py-12">
      <div class="max-w-3xl space-y-5">
        <p class="text-sm font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-300">
          ${moduleNoun(options.kind)} modules
        </p>
        <h1 class="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl dark:text-white">
          {{ appConfig.appName }}
        </h1>
        <p class="text-lg leading-8 text-slate-600 dark:text-slate-300">
          ${options.description}
        </p>
        <div class="flex flex-wrap gap-3">
          <a
            [routerLink]="'/' + appConfig.toolsRouteSegment | localLink"
            class="bg-primary rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
          >
            Browse modules
          </a>
          <a
            [href]="appConfig.githubUrl"
            target="_blank"
            class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Contribute
          </a>
        </div>
      </div>
    </section>
  \`,
})
export class ${className} {
  readonly appConfig = inject(AppConfigService);
}
`;
}
