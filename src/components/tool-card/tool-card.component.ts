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
    <div class="group relative flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 overflow-hidden">
      <!-- Header Color Strip -->
      <div class="h-2 w-full transition-opacity group-hover:opacity-100 opacity-80" [style.background-color]="tool().color || '#cbd5e1'"></div>
      
      <div class="p-5 flex-1 flex flex-col">
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
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
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              #{{ tag }}
            </span>
          }
        </div>
      </div>

      <!-- Action Footer -->
      <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
        <a [routerLink]="('/' + tool().routePath) | localLink" class="text-sm font-medium text-primary hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
          {{ t.map()['OPEN_TOOL'] }}
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
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