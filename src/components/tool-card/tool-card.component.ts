import { Component, input, output, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { ToolMetadata } from '../../services/tool.service';
import { I18nService } from '../../services/i18n.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-tool-card',
  standalone: true,
  imports: [RouterLink, LocalLinkPipe],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  template: `
    <div
      class="tool-card group relative flex h-full flex-col overflow-hidden rounded-xl transition-all duration-300"
      [style.--tool-color]="tool().color || '#cbd5e1'"
    >
      <div
        class="h-1.5 w-full"
        [style.background]="
          'linear-gradient(90deg, ' +
          (tool().color || '#cbd5e1') +
          ', ' +
          (tool().color || '#cbd5e1') +
          '66)'
        "
      ></div>

      <div
        class="color-wash pointer-events-none absolute top-0 right-0 left-0 h-28"
        [style.background]="
          'linear-gradient(180deg, ' + (tool().color || '#cbd5e1') + ', transparent)'
        "
      ></div>

      <div class="relative z-10 flex flex-1 flex-col p-5">
        <div class="mb-4 flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
              class="icon-box rounded-lg p-2.5 text-slate-700 dark:text-slate-200"
              [style.background]="
                'color-mix(in srgb, ' + (tool().color || '#cbd5e1') + ' 14%, transparent)'
              "
            >
              <span class="material-symbols-outlined text-2xl">{{ tool().icon }}</span>
            </div>
            <div>
              <h3 class="text-lg leading-tight font-bold text-slate-900 dark:text-white">
                <a
                  [routerLink]="'/' + tool().routePath | localLink"
                  class="focus:ring-primary rounded hover:underline focus:ring-2 focus:ring-offset-2 focus:outline-none"
                >
                  {{ name() }}
                </a>
              </h3>
              <span class="text-xs text-slate-500 dark:text-slate-400">v{{ tool().version }}</span>
            </div>
          </div>

          <button
            (click)="toggleFavorite.emit(tool().id)"
            class="text-slate-400 transition-colors hover:text-yellow-400 focus:text-yellow-400 focus:outline-none"
            [attr.aria-label]="isFavorite() ? 'Remove from favorites' : 'Add to favorites'"
          >
            <span class="material-symbols-outlined" [class.fill-current]="isFavorite()">
              {{ isFavorite() ? 'star' : 'star' }}
            </span>
          </button>
        </div>

        <p class="mb-4 line-clamp-2 flex-1 text-sm text-slate-600 dark:text-slate-300">
          {{ description() }}
        </p>

        <div class="mt-auto flex flex-wrap gap-2">
          @for (tag of displayedTags(); track tag) {
            <span
              class="tag-pill inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              #{{ tag }}
            </span>
          }
        </div>
      </div>

      <!-- Action Footer -->
      <div class="card-footer relative z-10 flex justify-end border-t px-5 py-3">
        <a
          [routerLink]="'/' + tool().routePath | localLink"
          class="text-primary flex items-center gap-1 text-sm font-medium hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {{ t.map()['OPEN_TOOL'] }}
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* ---- Light-mode glass ---- */
      .tool-card {
        background: rgba(255, 255, 255, 0.55);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.5);
        box-shadow:
          0 4px 24px -4px rgba(0, 0, 0, 0.07),
          inset 0 0.5px 0 0 rgba(255, 255, 255, 0.8);
      }

      .tool-card:hover {
        transform: translateY(-3px);
        border-color: color-mix(in srgb, var(--tool-color) 45%, rgba(255, 255, 255, 0.5));
        box-shadow:
          0 12px 40px -8px color-mix(in srgb, var(--tool-color) 28%, transparent),
          0 4px 16px -2px rgba(0, 0, 0, 0.06),
          inset 0 0.5px 0 0 rgba(255, 255, 255, 0.9);
      }

      .color-wash {
        opacity: 0.06;
      }
      .tool-card:hover .color-wash {
        opacity: 0.1;
      }

      .tag-pill {
        background: rgba(0, 0, 0, 0.04);
        border: 1px solid rgba(0, 0, 0, 0.06);
      }

      .card-footer {
        background: rgba(255, 255, 255, 0.35);
        border-color: rgba(0, 0, 0, 0.05);
      }

      .icon-box {
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.25);
      }

      /* ---- Dark-mode glass ---- */
      :host-context(.dark) .tool-card {
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
          0 4px 24px -4px rgba(0, 0, 0, 0.35),
          inset 0 0.5px 0 0 rgba(255, 255, 255, 0.04);
      }

      :host-context(.dark) .tool-card:hover {
        border-color: color-mix(in srgb, var(--tool-color) 40%, rgba(255, 255, 255, 0.08));
        box-shadow:
          0 12px 40px -8px color-mix(in srgb, var(--tool-color) 30%, transparent),
          0 4px 16px -2px rgba(0, 0, 0, 0.25),
          inset 0 0.5px 0 0 rgba(255, 255, 255, 0.06);
      }

      :host-context(.dark) .color-wash {
        opacity: 0.1;
      }
      :host-context(.dark) .tool-card:hover .color-wash {
        opacity: 0.18;
      }

      :host-context(.dark) .tag-pill {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      :host-context(.dark) .card-footer {
        background: rgba(0, 0, 0, 0.18);
        border-color: rgba(255, 255, 255, 0.06);
      }

      :host-context(.dark) .icon-box {
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .fill-current {
        font-variation-settings: 'FILL' 1;
        color: #facc15;
      }
    `,
  ],
})
export class ToolCardComponent {
  tool = input.required<ToolMetadata>();
  isFavorite = input<boolean>(false);
  toggleFavorite = output<string>();

  t = inject(ScopedTranslationService);
  i18n = inject(I18nService);

  name = computed(() => this.i18n.resolve(this.tool().name));
  description = computed(() => this.i18n.resolve(this.tool().description));

  displayedTags = computed(() => this.tool().tags.slice(0, 3));
}
