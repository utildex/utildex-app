import { Component, inject, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
import { ToolService } from '../../services/tool.service';
import { ToolCardComponent } from '../../components/tool-card/tool-card.component';
import { FormsModule } from '@angular/forms';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { TourTargetDirective } from '../../directives/tour-target.directive';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-all-tools',
  standalone: true,
  imports: [ToolCardComponent, FormsModule, TourTargetDirective],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh
    })
  ],
  template: `
    <div class="flex flex-col gap-8 w-full">
      <!-- Top Control Bar (Search, Filter, Sort) -->
      <header class="w-full space-y-6" #gridTop>
        <div class="flex flex-col md:flex-row gap-4">
             <!-- Search -->
             <div class="flex-1 relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input 
                  type="text" 
                  [ngModel]="searchQuery()"
                  (ngModelChange)="toolService.setSearch($event)"
                  [placeholder]="t.map()['SEARCH_PLACEHOLDER']" 
                  class="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                >
             </div>
             
             <!-- Sort Dropdown -->
             <div class="relative flex-shrink-0">
                <div class="flex items-center gap-2 h-full bg-white dark:bg-slate-800 px-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                   <select 
                      [ngModel]="sortOrder()" 
                      (ngModelChange)="toolService.setSort($event)"
                      class="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer pr-8 py-3 outline-none"
                   >
                     <option value="name">{{ t.map()['SORT_BY'] }}: {{ t.map()['SORT_NAME'] }}</option>
                     <option value="popularity">{{ t.map()['SORT_BY'] }}: {{ t.map()['SORT_POPULARITY'] }}</option>
                     <option value="relevance">{{ t.map()['SORT_BY'] }}: {{ t.map()['SORT_RELEVANCE'] }}</option>
                   </select>
                </div>
             </div>
        </div>

        <!-- Categories (Pills) -->
        <div class="flex flex-wrap gap-2 pb-2" appTourTarget="tour-filters">
            <button 
                (click)="toolService.setCategory(null)"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm"
                [class.bg-slate-900]="selectedCategory() === null"
                [class.text-white]="selectedCategory() === null"
                [class.bg-white]="selectedCategory() !== null"
                [class.text-slate-600]="selectedCategory() !== null"
                [class.dark:bg-white]="selectedCategory() === null"
                [class.dark:text-slate-900]="selectedCategory() === null"
                [class.dark:bg-slate-800]="selectedCategory() !== null"
                [class.dark:text-slate-300]="selectedCategory() !== null"
            >
               {{ t.map()['CAT_ALL'] }}
            </button>
            @for (cat of categories(); track cat) {
              <button 
                (click)="toolService.setCategory(cat)"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm"
                [class.bg-slate-900]="selectedCategory() === cat"
                [class.text-white]="selectedCategory() === cat"
                [class.bg-white]="selectedCategory() !== cat"
                [class.text-slate-600]="selectedCategory() !== cat"
                [class.dark:bg-white]="selectedCategory() === cat"
                [class.dark:text-slate-900]="selectedCategory() === cat"
                [class.dark:bg-slate-800]="selectedCategory() !== cat"
                [class.dark:text-slate-300]="selectedCategory() !== cat"
              >
                  {{ toolService.getCategoryName(cat) }}
              </button>
            }
        </div>
      </header>

      <!-- Grid Results -->
      <main class="space-y-6">
        <div class="flex items-center justify-between px-1">
           <!-- Dynamic Title if needed, or just showing count -->
           <h2 class="text-xl font-bold text-slate-800 dark:text-slate-200">
              @if(selectedCategory()) {
                  {{ toolService.getCategoryName(selectedCategory()!) }}
              } @else {
                  {{ t.map()['TITLE'] }}
              }
           </h2>
           <div class="text-sm text-slate-500 font-medium">
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
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            @for (tool of paginatedTools(); track tool.id) {
              <app-tool-card [tool]="tool" [isFavorite]="isFav(tool.id)" (toggleFavorite)="toggleFav($event)"></app-tool-card>
            }
          </div>

          <!-- Pagination Controls -->
          @if (totalPages() > 1) {
             <div class="flex justify-center items-center gap-4 pt-12">
                <button 
                  (click)="prevPage()" 
                  [disabled]="currentPage() === 1"
                  class="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                   <span class="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                
                <span class="text-sm font-bold text-slate-700 dark:text-slate-300">
                   {{ getPageInfo() }}
                </span>

                <button 
                  (click)="nextPage()" 
                  [disabled]="currentPage() === totalPages()"
                  class="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                   <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
             </div>
          }
        }
      </main>
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
  categories = this.toolService.categories;
  selectedCategory = this.toolService.selectedCategory;
  sortOrder = this.toolService.sortOrder;
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
    effect(() => {
      this.filteredTools();
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
}
