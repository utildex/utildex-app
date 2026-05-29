import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppConfigService } from '../../services/app-config.service';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-simudex-welcome',
  standalone: true,
  imports: [RouterLink, LocalLinkPipe],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <section class="flex min-h-[calc(100vh-8rem)] items-center py-12">
      <div
        class="grid w-full gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] lg:items-center"
      >
        <div class="space-y-6">
          <img src="/assets/images/simudex_icon.svg" alt="" class="h-16 w-16" />
          <div class="space-y-4">
            <p
              class="text-sm font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-300"
            >
              {{ t.map()['BADGE'] }}
            </p>
            <h1
              class="max-w-3xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl dark:text-white"
            >
              {{ appConfig.appName }}
            </h1>
            <p class="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              {{ t.map()['DESCRIPTION'] }}
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a
              [routerLink]="'/' + appConfig.toolsRouteSegment | localLink"
              class="bg-primary rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              {{ t.map()['CTA_BROWSE'] }}
            </a>
            <a
              [href]="appConfig.githubUrl"
              target="_blank"
              class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {{ t.map()['CTA_CONTRIBUTE'] }}
            </a>
          </div>
        </div>

        <div
          class="relative aspect-[4/3] min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950"
        >
          <div
            class="absolute inset-x-0 top-0 flex h-12 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800"
          >
            <span class="h-3 w-3 rounded-full bg-red-400"></span>
            <span class="h-3 w-3 rounded-full bg-amber-400"></span>
            <span class="h-3 w-3 rounded-full bg-emerald-400"></span>
          </div>
          <div class="absolute inset-0 top-12 grid place-items-center p-8">
            <svg viewBox="0 0 520 360" class="h-full w-full" aria-hidden="true">
              <rect
                x="42"
                y="250"
                width="436"
                height="8"
                rx="4"
                class="fill-slate-200 dark:fill-slate-800"
              />
              <path
                d="M80 250 C155 70 285 320 440 104"
                fill="none"
                stroke="#2563eb"
                stroke-width="8"
                stroke-linecap="round"
              />
              <path
                d="M80 250 C160 150 260 176 440 104"
                fill="none"
                stroke="#22c55e"
                stroke-width="5"
                stroke-linecap="round"
                stroke-dasharray="12 14"
              />
              <circle cx="80" cy="250" r="14" fill="#38bdf8" />
              <circle cx="228" cy="198" r="18" fill="#2563eb" />
              <circle cx="440" cy="104" r="14" fill="#22c55e" />
              <g class="fill-slate-500 dark:fill-slate-400">
                <rect x="92" y="286" width="86" height="10" rx="5" />
                <rect x="92" y="306" width="130" height="10" rx="5" opacity="0.55" />
                <rect x="304" y="286" width="124" height="10" rx="5" />
                <rect x="304" y="306" width="86" height="10" rx="5" opacity="0.55" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class SimudexWelcomeComponent {
  appConfig = inject(AppConfigService);
  t = inject(ScopedTranslationService);
}
