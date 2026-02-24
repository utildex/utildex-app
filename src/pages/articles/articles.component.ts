import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArticleService } from '../../services/article.service';
import { ArticleCardComponent } from '../../components/article-card/article-card.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { I18nService } from '../../services/i18n.service';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, ArticleCardComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <div class="space-y-8">
      <!-- Header & Controls -->
      <div class="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 class="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
            {{ t.map()['TITLE'] }}
          </h1>
          <p class="text-slate-500 dark:text-slate-400">{{ t.map()['DESC'] }}</p>
        </div>

        <div class="flex w-full flex-col gap-4 sm:flex-row md:w-auto">
          <!-- Search -->
          <div class="relative flex-1 sm:w-64">
            <span
              class="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              >search</span
            >
            <input
              type="text"
              [(ngModel)]="searchQuery"
              [placeholder]="t.map()['SEARCH_PLACEHOLDER']"
              class="focus:ring-primary w-full rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-10 text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <!-- View Toggle -->
          <div class="flex self-start rounded-xl bg-slate-200 p-1 dark:bg-slate-700">
            <button
              (click)="viewMode.set('grid')"
              class="flex items-center rounded-lg p-2 transition-all"
              [class.bg-white]="viewMode() === 'grid'"
              [class.shadow-sm]="viewMode() === 'grid'"
              [class.text-primary]="viewMode() === 'grid'"
              [class.text-slate-500]="viewMode() !== 'grid'"
              [class.dark:bg-slate-800]="viewMode() === 'grid'"
              [class.dark:text-white]="viewMode() === 'grid'"
            >
              <span class="material-symbols-outlined">grid_view</span>
            </button>
            <button
              (click)="viewMode.set('list')"
              class="flex items-center rounded-lg p-2 transition-all"
              [class.bg-white]="viewMode() === 'list'"
              [class.shadow-sm]="viewMode() === 'list'"
              [class.text-primary]="viewMode() === 'list'"
              [class.text-slate-500]="viewMode() !== 'list'"
              [class.dark:bg-slate-800]="viewMode() === 'list'"
              [class.dark:text-white]="viewMode() === 'list'"
            >
              <span class="material-symbols-outlined">view_list</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Tags -->
      <div class="flex flex-wrap gap-2">
        <button
          (click)="activeTag.set(null)"
          class="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
          [class]="
            !activeTag()
              ? 'border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'border-slate-200 bg-transparent text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400'
          "
        >
          {{ t.map()['ALL_TAGS'] }}
        </button>
        @for (tag of allTags(); track tag) {
          <button
            (click)="activeTag.set(tag)"
            class="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
            [class]="
              activeTag() === tag
                ? 'bg-primary border-primary text-white'
                : 'hover:border-primary hover:text-primary border-slate-200 bg-transparent text-slate-600 dark:border-slate-700 dark:text-slate-400'
            "
          >
            {{ tag }}
          </button>
        }
      </div>

      <!-- Content -->
      @if (filteredArticles().length === 0) {
        <div class="py-20 text-center text-slate-500">
          <span class="material-symbols-outlined mb-4 text-5xl opacity-30">feed</span>
          <p>{{ t.map()['NO_RESULTS'] }}</p>
        </div>
      } @else {
        @if (viewMode() === 'grid') {
          <div class="animate-fade-in grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            @for (article of filteredArticles(); track article.id) {
              <app-article-card [article]="article" layout="grid"></app-article-card>
            }
          </div>
        } @else {
          <div class="animate-fade-in space-y-4">
            @for (article of filteredArticles(); track article.id) {
              <app-article-card [article]="article" layout="list"></app-article-card>
            }
          </div>
        }
      }
    </div>
  `,
})
export class ArticlesComponent {
  articleService = inject(ArticleService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);

  searchQuery = signal('');
  activeTag = signal<string | null>(null);
  viewMode = signal<'grid' | 'list'>('grid');

  allTags = this.articleService.allTags;

  filteredArticles = computed(() => {
    let list = this.articleService.recentArticles();
    const query = this.searchQuery().toLowerCase();
    const tag = this.activeTag();

    if (tag) {
      list = list.filter((a) => a.tags.includes(tag));
    }

    if (query) {
      list = list.filter(
        (a) =>
          this.i18n.resolve(a.title).toLowerCase().includes(query) ||
          this.i18n.resolve(a.summary).toLowerCase().includes(query),
      );
    }

    return list;
  });
}
