import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { ToolService } from '../../services/tool.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-categories',
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
    <div class="space-y-8">
      <div class="flex flex-col gap-2">
        <h1 class="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
          <span class="material-symbols-outlined text-3xl text-slate-500">grid_view</span>
          {{ t.map()['TITLE'] }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400">
          {{ getSubtitle() }}
        </p>
      </div>

      <div class="animate-fade-in grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        @for (cat of categories(); track cat) {
          <a
            [routerLink]="['/categories', cat] | localLink"
            class="glass-surface glass-surface-hover group block rounded-xl p-6 transition-all"
          >
            <div class="mb-4 flex items-center justify-between">
              <span
                class="material-symbols-outlined group-hover:text-primary text-4xl text-slate-400 transition-colors"
                >folder</span
              >
              <span
                class="material-symbols-outlined text-slate-300 transition-transform group-hover:translate-x-1"
                >arrow_forward</span
              >
            </div>
            <h2
              class="group-hover:text-primary mb-2 text-xl font-bold text-slate-900 transition-colors dark:text-white"
            >
              {{ toolService.getCategoryName(cat) }}
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ toolService.getToolsByCategory(cat).length }} {{ t.map()['TOOLS_COUNT_SUFFIX'] }}
            </p>
          </a>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class CategoriesComponent {
  toolService = inject(ToolService);
  t = inject(ScopedTranslationService);
  categories = this.toolService.categories;

  getSubtitle(): string {
    const template =
      this.t.map()['SUBTITLE'] || 'Exploring {0} categories containing {1} total tools.';
    const totalTools = this.toolService.tools().length;
    return template
      .replace('{0}', this.categories().length.toString())
      .replace('{1}', totalTools.toString());
  }
}
