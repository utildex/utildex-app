import { Component, input, inject, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { ToolService } from '../../services/tool.service';
import { I18nService } from '../../services/i18n.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-tool-layout',
  standalone: true,
  imports: [RouterLink, LocalLinkPipe],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <div class="mx-auto max-w-5xl">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center text-sm font-medium text-slate-500">
        <a
          [routerLink]="'/tools' | localLink"
          class="hover:text-primary flex items-center gap-1 transition-colors"
        >
          <span class="material-symbols-outlined text-sm">arrow_back</span>
          {{ t.map()['BACK_TO_TOOLS'] }}
        </a>
        <span class="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <span class="truncate text-slate-900 dark:text-slate-200">{{ name() }}</span>
      </nav>

      @if (tool(); as tInfo) {
        <!-- Standardized Header -->
        <header class="animate-fade-in mb-8">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-5">
              <div class="group relative">
                <div
                  class="bg-primary/20 absolute inset-0 rounded-2xl opacity-0 blur transition-opacity duration-500 group-hover:opacity-100"
                ></div>
                <div
                  class="text-primary relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <span class="material-symbols-outlined text-4xl">{{ tInfo.icon }}</span>
                </div>
              </div>
              <div>
                <h1
                  class="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
                >
                  {{ name() }}
                </h1>
                <p class="mt-1 text-lg text-slate-500 dark:text-slate-400">{{ description() }}</p>

                <div class="mt-3 flex flex-wrap gap-2">
                  @for (cat of tInfo.categories; track cat) {
                    <span
                      class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    >
                      {{ toolService.getCategoryName(cat) }}
                    </span>
                  }
                  <span
                    class="inline-flex items-center rounded-full border border-slate-100 bg-slate-50 px-2.5 py-0.5 font-mono text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                  >
                    v{{ tInfo.version }}
                  </span>
                </div>
              </div>
            </div>

            <button
              (click)="toggleFav()"
              class="focus:ring-primary group flex-shrink-0 rounded-xl p-3 transition-colors hover:bg-slate-100 focus:ring-2 focus:outline-none dark:hover:bg-slate-800"
              [class.text-yellow-400]="isFav()"
              [class.text-slate-300]="!isFav()"
              [class.dark:text-slate-600]="!isFav()"
              [attr.aria-label]="isFav() ? t.map()['REMOVE_FAV'] : t.map()['ADD_FAV']"
            >
              <span
                class="material-symbols-outlined text-3xl transition-transform group-hover:scale-110"
                [class.fill-current]="isFav()"
                >star</span
              >
            </button>
          </div>
        </header>

        <!-- Tool Workspace -->
        <main class="animate-fade-in-up delay-100">
          <ng-content></ng-content>
        </main>
      }
    </div>
  `,
  styles: [
    `
      .fill-current {
        font-variation-settings: 'FILL' 1;
      }
      .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.5s ease-out backwards;
      }
      .delay-100 {
        animation-delay: 100ms;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ToolLayoutComponent {
  toolId = input.required<string>();
  toolService = inject(ToolService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);

  tool = computed(() => this.toolService.tools().find((t) => t.id === this.toolId()));
  name = computed(() => (this.tool() ? this.i18n.resolve(this.tool()!.name) : ''));
  description = computed(() => (this.tool() ? this.i18n.resolve(this.tool()!.description) : ''));

  isFav = computed(() => this.toolService.favorites().has(this.toolId()));

  constructor() {
    effect(() => {
      const id = this.toolId();
      if (id) {
        // Track usage when tool is loaded
        this.toolService.trackToolUsage(id);
      }
    });
  }

  toggleFav() {
    this.toolService.toggleFavorite(this.toolId());
  }
}
