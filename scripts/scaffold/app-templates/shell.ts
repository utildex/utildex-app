import { objectKey, pascalCase } from '../common';
import { SCAFFOLD_LANGUAGE_CODES, languageImportIdentifier } from '../languages';
import type { AppScaffoldOptions } from '../types';

export function indexTsxTemplate(options: AppScaffoldOptions): string {
  const className = `${pascalCase(options.id)}AppComponent`;
  return `import { provideHttpClient, withFetch } from '@angular/common/http';
import { ErrorHandler, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withPreloading, NoPreloading } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { ${className} } from '../shell/app.component';
import { routes } from '../routing/app.routes';
import { GlobalErrorHandler } from '../../../core/global-error-handler';
import { TOUR_STEPS } from '../../../core/tour.config';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

if (isLocalhost && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const registration of registrations) {
        const scriptUrls = [
          registration.active?.scriptURL,
          registration.waiting?.scriptURL,
          registration.installing?.scriptURL,
        ];
        if (scriptUrls.some((url) => url?.includes('ngsw-worker.js'))) {
          void registration.unregister();
        }
      }
    })
    .catch(() => undefined);
}

bootstrapApplication(${className}, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withPreloading(NoPreloading)),
    provideHttpClient(withFetch()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && !isLocalhost,
      registrationStrategy: 'registerImmediately',
    }),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    { provide: TOUR_STEPS, useValue: [] },
  ],
}).catch((err) => console.error(err));
`;
}

export function indexHtmlTemplate(options: AppScaffoldOptions): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="app-id" content="${options.id}" />
    <base href="/" />

    <title>${options.name}</title>
    <meta name="theme-color" content="${options.themeColor}" />
    <meta name="description" content="${options.description}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${options.name}" />
    <meta property="og:description" content="${options.description}" />

    <link rel="manifest" href="/manifest.webmanifest" />
  </head>

  <body class="overflow-x-hidden bg-transparent text-slate-900 transition-colors duration-300 dark:text-slate-100">
    <script src="/assets/theme-init.js"></script>
    <app-root>
      <div style="padding: 5rem 1rem; text-align: center; font-family: system-ui, sans-serif;">
        <h1 style="font-size: 2.5rem; font-weight: 800; margin: 0;">${options.name}</h1>
        <p style="margin-top: 1rem; color: #475569;">${options.description}</p>
      </div>
    </app-root>
  </body>
</html>
`;
}

export function appComponentTsTemplate(options: AppScaffoldOptions): string {
  const className = `${pascalCase(options.id)}AppComponent`;
  const languageImports = SCAFFOLD_LANGUAGE_CODES.map(
    (code) => `import ${languageImportIdentifier(code)} from '../../i18n/${code}';`,
  ).join('\n');
  const translationLoaders = SCAFFOLD_LANGUAGE_CODES.map(
    (code) => `${objectKey(code)}: () => ${languageImportIdentifier(code)}`,
  ).join(', ');

  return `import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AppUpdateService } from '../../services/platform/app-update.service';
import { AppConfigService } from '../../services/platform/app-config.service';
import { BackgroundComponent } from '../../components/background/background.component';
import { BubbleDirective } from '../../directives/bubble.directive';
import { CommandPaletteComponent } from '../../components/command-palette/command-palette.component';
import { ErrorOverlayComponent } from '../../components/error-overlay/error-overlay.component';
import { FontLoaderService } from '../../services/platform/font-loader.service';
import { I18nService } from '../../services/ui/i18n.service';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { NetworkStatusComponent } from '../../components/network-status/network-status.component';
import { SeoService } from '../../services/platform/seo.service';
import { SettingsModalComponent } from '../../components/settings-modal/settings-modal.component';
import { ShortcutService } from '../../services/platform/shortcut.service';
import { ThemeService } from '../../services/ui/theme.service';
import { ToastComponent } from '../../components/toast/toast.component';
import { AppFooterComponent } from '../../components/app-footer/app-footer.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
${languageImports}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BackgroundComponent,
    ToastComponent,
    CommandPaletteComponent,
    NetworkStatusComponent,
    ErrorOverlayComponent,
    SettingsModalComponent,
    BubbleDirective,
    AppFooterComponent,
    LocalLinkPipe,
  ],
  templateUrl: './app.component.html',
  providers: [provideTranslation({ ${translationLoaders} })],
})
export class ${className} implements OnInit {
  private readonly router = inject(Router);
  private readonly i18nService = inject(I18nService);
  private readonly fonts = inject(FontLoaderService);

  readonly appConfig = inject(AppConfigService);
  readonly currentLang = this.i18nService.currentLang;
  readonly mobileMenuOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly isWelcomePage = signal(false);
  readonly updates = inject(AppUpdateService);
  readonly shortcutService = inject(ShortcutService);
  readonly seoService = inject(SeoService);
  readonly t = inject(ScopedTranslationService);
  readonly themeService = inject(ThemeService);

  @ViewChild(CommandPaletteComponent) commandPalette!: CommandPaletteComponent;

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.mobileMenuOpen.set(false);
      this.updateShellRouteState();
    });
  }

  ngOnInit(): void {
    this.fonts.observeMaterialSymbolsUsage();
    this.updateShellRouteState();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
  }

  openCommandPalette(): void {
    this.commandPalette.open();
  }

  private updateShellRouteState(): void {
    const url = this.router.url.split('?')[0];
    const segments = url.split('/').filter((segment) => segment.length > 0);
    this.isWelcomePage.set(segments.length === 1);
  }
}
`;
}

export function appComponentHtmlTemplate(): string {
  return `<app-background></app-background>

<div class="relative flex h-screen flex-col overflow-hidden supports-[height:100dvh]:h-[100dvh]">
  <header class="z-40 w-full flex-shrink-0 bg-white/75 shadow-sm backdrop-blur dark:bg-slate-950/75">
    <div class="max-w-full px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <a [routerLink]="'/' | localLink" class="flex items-center gap-3 font-bold text-slate-950 dark:text-white">
          <span class="material-symbols-outlined text-primary" aria-hidden="true">apps</span>
          @if (!isWelcomePage()) {
            <span>{{ appConfig.appName }}</span>
          }
        </a>

        <div class="flex items-center gap-2">
          <nav class="hidden md:flex">
            <a
              [routerLink]="'/' + appConfig.toolsRouteSegment | localLink"
              routerLinkActive="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {{ appConfig.toolsRouteSegment }}
            </a>
          </nav>

          @if (updates.isUpdateAvailable()) {
            <button
              [appBubble]="'BUBBLE_UPDATE_AVAILABLE'"
              [bubblePos]="'bottom'"
              (click)="updates.applyUpdateAndReload()"
              [disabled]="updates.isUpdating()"
              class="bg-primary hidden rounded-lg px-3 py-1.5 text-xs font-bold text-white md:block"
            >
              {{ updates.isUpdating() ? t.map()['BTN_UPDATING'] : t.map()['BTN_UPDATE_AVAILABLE'] }}
            </button>
          }

          <button
            type="button"
            (click)="openCommandPalette()"
            class="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:block dark:text-slate-300 dark:hover:bg-slate-800"
            [attr.aria-label]="t.map()['NAV_SEARCH_MOBILE'] || 'Search'"
          >
            <span class="material-symbols-outlined">search</span>
          </button>

          <button
            type="button"
            (click)="toggleSettings()"
            class="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:block dark:text-slate-300 dark:hover:bg-slate-800"
            [attr.aria-label]="t.map()['TOUR_TITLE_SETTINGS_OPEN'] || 'Settings'"
          >
            <span class="material-symbols-outlined">settings</span>
          </button>

          <button
            type="button"
            (click)="toggleMobileMenu()"
            class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            <span class="material-symbols-outlined">{{ mobileMenuOpen() ? 'close' : 'menu' }}</span>
          </button>
        </div>
      </div>
    </div>

    @if (mobileMenuOpen()) {
      <div class="border-t border-slate-200 bg-white px-4 py-4 shadow-xl md:hidden dark:border-slate-800 dark:bg-slate-950">
        <nav class="grid gap-2">
          <a
            [routerLink]="'/' + appConfig.toolsRouteSegment | localLink"
            (click)="mobileMenuOpen.set(false)"
            class="rounded-xl bg-slate-50 px-4 py-3 font-medium text-slate-900 dark:bg-slate-800 dark:text-white"
          >
            {{ appConfig.toolsRouteSegment }}
          </a>
          <button
            type="button"
            (click)="toggleSettings(); mobileMenuOpen.set(false)"
            class="rounded-xl px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300"
          >
            {{ t.map()['TOUR_TITLE_SETTINGS_OPEN'] || 'Settings' }}
          </button>
        </nav>
      </div>
    }
  </header>

  <main class="relative w-full flex-1 overflow-x-hidden overflow-y-auto">
    <div class="mx-auto flex min-h-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
      <router-outlet></router-outlet>
      <app-footer class="mt-auto w-full"></app-footer>
    </div>
  </main>

  <app-toast></app-toast>
  <app-network-status></app-network-status>
  <app-command-palette></app-command-palette>
  <app-error-overlay></app-error-overlay>

  @if (settingsOpen()) {
    @defer (when settingsOpen()) {
      <app-settings-modal (close)="settingsOpen.set(false)"></app-settings-modal>
    }
  }
</div>
`;
}
