import { Component, inject, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { ToolService } from '../../services/tool.service';
import { ToolCardComponent } from '../../components/tool-card/tool-card.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [ToolCardComponent, RouterLink, LocalLinkPipe],
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
        <a
          [routerLink]="'/categories' | localLink"
          class="hover:text-primary mb-2 flex items-center gap-1 text-sm text-slate-500"
        >
          <span class="material-symbols-outlined text-sm">arrow_back</span>
          {{ t.map()['BACK_LINK'] }}
        </a>
        <h1 class="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
          <span class="material-symbols-outlined text-primary text-3xl">folder_open</span>
          {{ toolService.getCategoryName(categoryId()) }}
        </h1>
      </div>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        @for (tool of tools(); track tool.id) {
          <app-tool-card
            [tool]="tool"
            [isFavorite]="isFav(tool.id)"
            (toggleFavorite)="toggleFav($event)"
          ></app-tool-card>
        }
      </div>
    </div>
  `,
})
export class CategoryDetailComponent {
  toolService = inject(ToolService);
  t = inject(ScopedTranslationService);

  // Route param input
  categoryId = input.required<string>({ alias: 'id' });

  tools = computed(() => {
    return this.toolService.getToolsByCategory(this.categoryId());
  });

  favorites = this.toolService.favorites;

  toggleFav(id: string) {
    this.toolService.toggleFavorite(id);
  }

  isFav(id: string): boolean {
    return this.favorites().has(id);
  }
}
