import { Component, inject, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
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
      <div class="flex-1 space-y-6" #gridTop>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ t.map()['TITLE'] }}</h1>
          <div class="text-sm text-slate-500">
             {{ getShowingText() }}
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
          <!-- Tools Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            @for (tool of paginatedTools(); track tool.id) {
              <app-tool-card [tool]="tool" [isFavorite]="isFav(tool.id)" (toggleFavorite)="toggleFav($event)"></app-tool-card>
            }
          </div>

          <!-- Pagination Controls -->
          @if (totalPages() > 1) {
             <div class="flex justify-center items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  (click)="prevPage()" 
                  [disabled]="currentPage() === 1"
                  class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-bold transition-colors"
                >
                   <span class="material-symbols-outlined text-sm">arrow_back</span>
                   {{ t.map()['PAGE_PREV'] }}
                </button>
                
                <span class="text-sm font-medium text-slate-500">
                   {{ getPageInfo() }}
                </span>

                <button 
                  (click)="nextPage()" 
                  [disabled]="currentPage() === totalPages()"
                  class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-bold transition-colors"
                >
                   {{ t.map()['PAGE_NEXT'] }}
                   <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
             </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AllToolsComponent {
  toolService = inject(ToolService);
  t = inject(ScopedTranslationService);

  gridTop = viewChild<ElementRef>('gridTop');

  searchQuery = this.toolService.searchQuery;
  selectedTags = this.toolService.selectedTags;
  allTags = this.toolService.allTags;
  filteredTools = this.toolService.filteredTools;
  favorites = this.toolService.favorites;

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 12;

  totalPages = computed(() => Math.ceil(this.filteredTools().length / this.itemsPerPage));

  paginatedTools = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredTools().slice(start, end);
  });

  constructor() {
    // Reset to page 1 when filters change
    effect(() => {
      // Dependency tracking
      this.filteredTools();
      // Action
      this.currentPage.set(1);
    }, { allowSignalWrites: true });
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.scrollToTop();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.scrollToTop();
    }
  }

  scrollToTop() {
    this.gridTop()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getShowingText(): string {
    const total = this.filteredTools().length;
    if (total === 0) return '';

    const start = (this.currentPage() - 1) * this.itemsPerPage + 1;
    const end = Math.min(start + this.itemsPerPage - 1, total);

    const template = this.t.map()['SHOWING_RANGE'] || 'Showing {0}-{1} of {2}';
    return template.replace('{0}', start.toString())
        .replace('{1}', end.toString())
        .replace('{2}', total.toString());
  }

  getPageInfo(): string {
    const template = this.t.map()['PAGE_INFO'] || 'Page {0} of {1}';
    return template.replace('{0}', this.currentPage().toString())
        .replace('{1}', this.totalPages().toString());
  }

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
