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
      zh: () => zh
    })
  ],
  template: `
    <div class="tool-card group relative flex flex-col h-full rounded-xl overflow-hidden transition-all duration-300"
         [style.--tool-color]="tool().color || '#cbd5e1'">
      <div class="h-1.5 w-full" [style.background]="'linear-gradient(90deg, ' + (tool().color || '#cbd5e1') + ', ' + (tool().color || '#cbd5e1') + '66)'"></div>

      <div class="absolute top-0 left-0 right-0 h-28 pointer-events-none color-wash"
           [style.background]="'linear-gradient(180deg, ' + (tool().color || '#cbd5e1') + ', transparent)'"></div>

      <div class="p-5 flex-1 flex flex-col relative z-10">
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <div class="icon-box p-2.5 rounded-lg text-slate-700 dark:text-slate-200"
                 [style.background]="'color-mix(in srgb, ' + (tool().color || '#cbd5e1') + ' 14%, transparent)'">
              <span class="material-symbols-outlined text-2xl">{{ tool().icon }}</span>
            </div>
            <div>
               <h3 class="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                <a [routerLink]="('/' + tool().routePath) | localLink" class="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded">
                  {{ name() }}
                </a>
               </h3>
               <span class="text-xs text-slate-500 dark:text-slate-400">v{{ tool().version }}</span>
            </div>
          </div>
          
          <button 
            (click)="toggleFavorite.emit(tool().id)"
            class="text-slate-400 hover:text-yellow-400 transition-colors focus:outline-none focus:text-yellow-400"
            [attr.aria-label]="isFavorite() ? 'Remove from favorites' : 'Add to favorites'"
          >
            <span class="material-symbols-outlined" [class.fill-current]="isFavorite()">
              {{ isFavorite() ? 'star' : 'star' }}
            </span>
          </button>
        </div>

        <p class="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-2 flex-1">
          {{ description() }}
        </p>

        <div class="flex flex-wrap gap-2 mt-auto">
          @for (tag of displayedTags(); track tag) {
            <span class="tag-pill inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300">
              #{{ tag }}
            </span>
          }
        </div>
      </div>

      <!-- Action Footer -->
      <div class="px-5 py-3 card-footer border-t flex justify-end relative z-10">
        <a [routerLink]="('/' + tool().routePath) | localLink" class="text-sm font-medium text-primary hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
          {{ t.map()['OPEN_TOOL'] }}
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ---- Light-mode glass ---- */
    .tool-card {
      background: rgba(255, 255, 255, 0.55);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.50);
      box-shadow:
        0 4px 24px -4px rgba(0, 0, 0, 0.07),
        inset 0 0.5px 0 0 rgba(255, 255, 255, 0.8);
    }

    .tool-card:hover {
      transform: translateY(-3px);
      border-color: color-mix(in srgb, var(--tool-color) 45%, rgba(255,255,255,0.5));
      box-shadow:
        0 12px 40px -8px color-mix(in srgb, var(--tool-color) 28%, transparent),
        0 4px 16px -2px rgba(0, 0, 0, 0.06),
        inset 0 0.5px 0 0 rgba(255, 255, 255, 0.9);
    }

    .color-wash { opacity: 0.06; }
    .tool-card:hover .color-wash { opacity: 0.10; }

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
      background: rgba(15, 23, 42, 0.50);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow:
        0 4px 24px -4px rgba(0, 0, 0, 0.35),
        inset 0 0.5px 0 0 rgba(255, 255, 255, 0.04);
    }

    :host-context(.dark) .tool-card:hover {
      border-color: color-mix(in srgb, var(--tool-color) 40%, rgba(255,255,255,0.08));
      box-shadow:
        0 12px 40px -8px color-mix(in srgb, var(--tool-color) 30%, transparent),
        0 4px 16px -2px rgba(0, 0, 0, 0.25),
        inset 0 0.5px 0 0 rgba(255, 255, 255, 0.06);
    }

    :host-context(.dark) .color-wash { opacity: 0.10; }
    :host-context(.dark) .tool-card:hover .color-wash { opacity: 0.18; }

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

    .fill-current { font-variation-settings: 'FILL' 1; color: #facc15; }
  `]
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