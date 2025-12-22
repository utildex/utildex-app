import { Component, inject } from '@angular/core';
import { ToolService } from '../../services/tool.service';
import { ToolCardComponent } from '../../components/tool-card/tool-card.component';
import { FormsModule } from '@angular/forms';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-all-tools',
  standalone: true,
  imports: [ToolCardComponent, FormsModule],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh
    })
  ],
  template: `
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Sidebar Filters -->
      <aside class="w-full lg:w-64 flex-shrink-0 space-y-6">
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">{{ t.map()['SEARCH_LABEL'] }}</h3>
          <input 
            type="text" 
            [ngModel]="searchQuery()"
            (ngModelChange)="toolService.setSearch($event)"
            [placeholder]="t.map()['SEARCH_PLACEHOLDER']" 
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary"
          >
        </div>

        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex justify-between items-center">
            {{ t.map()['TAGS_LABEL'] }}
            @if(selectedTags().size > 0) {
              <button (click)="resetTags()" class="text-xs text-primary hover:underline">{{ t.map()['RESET'] }}</button>
            }
          </h3>
          <div class="flex flex-wrap gap-2">
            @for (tag of allTags(); track tag) {
              <button 
                (click)="toggleTag(tag)"
                class="px-2 py-1 rounded-md text-xs font-medium transition-colors border"
                [class]="selectedTags().has(tag) 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                {{ tag }}
              </button>
            }
          </div>
        </div>
      </aside>

      <!-- Grid -->
      <div class="flex-1 space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ t.map()['TITLE'] }}</h1>
          <div class="text-sm text-slate-500">
            {{ t.map()['SHOWING_PREFIX'] }} {{ filteredTools().length }} {{ t.map()['SHOWING_SUFFIX'] }}
          </div>
        </div>

        @if (filteredTools().length === 0) {
          <div class="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <span class="material-symbols-outlined text-5xl text-slate-300 mb-4">search_off</span>
            <p class="text-lg text-slate-500 mb-4">{{ t.map()['NO_TOOLS_TITLE'] }}</p>
            <p class="text-sm text-slate-400">{{ t.map()['NO_TOOLS_DESC'] }}</p>
            <button (click)="toolService.resetFilters()" class="mt-4 text-primary hover:underline">{{ t.map()['RESET_FILTERS'] }}</button>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (tool of filteredTools(); track tool.id) {
              <app-tool-card [tool]="tool" [isFavorite]="isFav(tool.id)" (toggleFavorite)="toggleFav($event)"></app-tool-card>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class AllToolsComponent {
  toolService = inject(ToolService);
  t = inject(ScopedTranslationService);

  searchQuery = this.toolService.searchQuery;
  selectedTags = this.toolService.selectedTags;
  allTags = this.toolService.allTags;
  filteredTools = this.toolService.filteredTools;
  favorites = this.toolService.favorites;

  toggleFav(id: string) {
    this.toolService.toggleFavorite(id);
  }

  isFav(id: string): boolean {
    return this.favorites().has(id);
  }

  toggleTag(tag: string) {
    this.toolService.toggleTag(tag);
  }

  resetTags() {
    this.toolService.selectedTags.set(new Set<string>());
  }
}