import { Component, inject, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
import { ToolService } from '../../services/tool.service';
import { ToolCardComponent } from '../../components/tool-card/tool-card.component';
import { FormsModule } from '@angular/forms';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { TourTargetDirective } from '../../directives/tour-target.directive';
import { DropdownComponent } from '../../components/dropdown/dropdown.component';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-all-tools',
  standalone: true,
  imports: [ToolCardComponent, FormsModule, TourTargetDirective, DropdownComponent],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  template: `
    <div class="flex w-full flex-col gap-4">
      <!-- Top Control Bar (Search, Filter, Sort) -->
      <header class="w-full space-y-4 overflow-visible pt-2" #gridTop>
        <div class="flex flex-col gap-4 md:flex-row">
          <!-- Search -->
          <div class="relative min-w-0 flex-1">
            <span
              class="material-symbols-outlined absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
              >search</span
            >
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="toolService.setSearch($event)"
              [placeholder]="t.map()['SEARCH_PLACEHOLDER']"
              class="glass-control focus:ring-primary h-12 w-full rounded-xl pr-4 pl-11 text-base text-slate-800 placeholder-slate-500 transition-all focus:ring-2 focus:outline-none dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>

          <!-- Sort Dropdown (Custom) -->
          <div class="relative max-w-full flex-shrink-0">
            <app-dropdown
              [options]="[
                { label: t.map()['SORT_BY'] + ': ' + t.map()['SORT_NAME'], value: 'name' },
                {
                  label: t.map()['SORT_BY'] + ': ' + t.map()['SORT_POPULARITY'],
                  value: 'popularity',
                },
                {
                  label: t.map()['SORT_BY'] + ': ' + t.map()['SORT_RELEVANCE'],
                  value: 'relevance',
                },
              ]"
              [value]="sortOrder()"
              [selectedLabel]="getSortLabel()"
              (valueChange)="toolService.setSort($event)"
            ></app-dropdown>
          </div>
        </div>

        <!-- Categories (Pills) -->
        <div class="flex flex-wrap gap-2 pb-2" appTourTarget="tour-filters">
          <button
            (click)="toolService.clearCategories()"
            class="glass-control cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all hover:text-primary hover:ring-1 hover:ring-primary/40"
            [class.text-primary]="selectedCategories().size === 0"
            [class.font-semibold]="selectedCategories().size === 0"
            [class.ring-1]="selectedCategories().size === 0"
            [class.ring-primary]="selectedCategories().size === 0"
            [class.text-slate-600]="selectedCategories().size > 0"
            [class.dark:text-slate-300]="selectedCategories().size > 0"
          >
            {{ t.map()['CAT_ALL'] }}
          </button>
          @for (cat of categories(); track cat) {
            <button
              (click)="toolService.toggleCategory(cat)"
              class="glass-control cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all hover:text-primary hover:ring-1 hover:ring-primary/40"
              [class.text-primary]="isCategorySelected(cat)"
              [class.font-semibold]="isCategorySelected(cat)"
              [class.ring-1]="isCategorySelected(cat)"
              [class.ring-primary]="isCategorySelected(cat)"
              [class.text-slate-600]="!isCategorySelected(cat)"
              [class.dark:text-slate-300]="!isCategorySelected(cat)"
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
            @if (selectedCategories().size === 1) {
              {{ toolService.getCategoryName(singleSelectedCategory()!) }}
            } @else {
              {{ t.map()['TITLE'] }}
            }
          </h2>
          <div class="text-sm font-medium text-slate-500">
            {{ getShowingText() }}
          </div>
        </div>

        @if (filteredTools().length === 0) {
          <div
            class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/50"
          >
            <span class="material-symbols-outlined mb-4 text-5xl text-slate-300">search_off</span>
            <p class="mb-4 text-lg text-slate-500">{{ t.map()['NO_TOOLS_TITLE'] }}</p>
            <p class="text-sm text-slate-400">{{ t.map()['NO_TOOLS_DESC'] }}</p>
            <button (click)="toolService.resetFilters()" class="text-primary mt-4 hover:underline">
              {{ t.map()['RESET_FILTERS'] }}
            </button>
          </div>
        } @else {
          <!-- Tools Grid -->
          <div
            class="animate-fade-in grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            @for (tool of paginatedTools(); track tool.id) {
              <app-tool-card
                [tool]="tool"
                [isFavorite]="isFav(tool.id)"
                (toggleFavorite)="toggleFav($event)"
              ></app-tool-card>
            }
          </div>

          <!-- Pagination Controls -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-center gap-4 pt-12">
              <button
                (click)="prevPage()"
                [disabled]="currentPage() === 1"
                class="glass-control flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300"
              >
                <span class="material-symbols-outlined text-sm">arrow_back</span>
              </button>

              <span class="text-sm font-bold text-slate-700 dark:text-slate-300">
                {{ getPageInfo() }}
              </span>

              <button
                (click)="nextPage()"
                [disabled]="currentPage() === totalPages()"
                class="glass-control flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300"
              >
                <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          }
        }
      </main>
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
export class AllToolsComponent {
  toolService = inject(ToolService);
  t = inject(ScopedTranslationService);

  gridTop = viewChild<ElementRef>('gridTop');

  searchQuery = this.toolService.searchQuery;
  categories = this.toolService.categories;
  selectedCategories = this.toolService.selectedCategories;
  sortOrder = this.toolService.sortOrder;
  filteredTools = this.toolService.filteredTools;
  favorites = this.toolService.favorites;

  singleSelectedCategory = computed(() => {
    const selected = this.selectedCategories();
    return selected.size === 1 ? [...selected][0] : null;
  });

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
    effect(
      () => {
        this.filteredTools();
        this.currentPage.set(1);
      },
      { allowSignalWrites: true },
    );
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.scrollToTop();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
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
    return template
      .replace('{0}', start.toString())
      .replace('{1}', end.toString())
      .replace('{2}', total.toString());
  }

  getPageInfo(): string {
    const template = this.t.map()['PAGE_INFO'] || 'Page {0} of {1}';
    return template
      .replace('{0}', this.currentPage().toString())
      .replace('{1}', this.totalPages().toString());
  }

  toggleFav(id: string) {
    this.toolService.toggleFavorite(id);
  }

  isFav(id: string): boolean {
    return this.favorites().has(id);
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories().has(category);
  }

  getSortLabel(): string {
    const val = this.sortOrder();
    if (val === 'name') return this.t.map()['SORT_BY'] + ': ' + this.t.map()['SORT_NAME'];
    if (val === 'popularity')
      return this.t.map()['SORT_BY'] + ': ' + this.t.map()['SORT_POPULARITY'];
    if (val === 'relevance') return this.t.map()['SORT_BY'] + ': ' + this.t.map()['SORT_RELEVANCE'];
    return '';
  }
}
