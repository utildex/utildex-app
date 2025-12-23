
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArticleService } from '../../services/article.service';
import { ArticleCardComponent } from '../../components/article-card/article-card.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { I18nService } from '../../services/i18n.service';

const en = { 
  "TITLE": "Articles & Tutorials", 
  "DESC": "Guides, tips, and news from the Utildex team.",
  "SEARCH_PLACEHOLDER": "Search articles...",
  "NO_RESULTS": "No articles found matching your criteria.",
  "ALL_TAGS": "All"
};
const fr = { 
  "TITLE": "Articles & Tutoriels", 
  "DESC": "Guides, astuces et nouvelles de l'équipe Utildex.",
  "SEARCH_PLACEHOLDER": "Rechercher des articles...",
  "NO_RESULTS": "Aucun article trouvé correspondant à vos critères.",
  "ALL_TAGS": "Tous"
};
const es = { 
  "TITLE": "Artículos y Tutoriales", 
  "DESC": "Guías, consejos y noticias del equipo Utildex.",
  "SEARCH_PLACEHOLDER": "Buscar artículos...",
  "NO_RESULTS": "No se encontraron artículos que coincidan con sus criterios.",
  "ALL_TAGS": "Todos"
};
const zh = { 
  "TITLE": "文章与教程", 
  "DESC": "来自 Utildex 团队的指南、技巧和新闻。",
  "SEARCH_PLACEHOLDER": "搜索文章...",
  "NO_RESULTS": "未找到符合条件的文章。",
  "ALL_TAGS": "全部"
};

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, ArticleCardComponent],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <div class="space-y-8">
      <!-- Header & Controls -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">{{ t.map()['TITLE'] }}</h1>
           <p class="text-slate-500 dark:text-slate-400">{{ t.map()['DESC'] }}</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
           <!-- Search -->
           <div class="relative flex-1 sm:w-64">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                [placeholder]="t.map()['SEARCH_PLACEHOLDER']" 
                class="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-slate-900 dark:text-white"
              >
           </div>
           
           <!-- View Toggle -->
           <div class="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl self-start">
              <button 
                (click)="viewMode.set('grid')" 
                class="p-2 rounded-lg flex items-center transition-all"
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
                class="p-2 rounded-lg flex items-center transition-all"
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
           class="px-3 py-1 rounded-full text-sm font-medium border transition-colors"
           [class]="!activeTag() 
             ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent' 
             : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'"
         >
           {{ t.map()['ALL_TAGS'] }}
         </button>
         @for (tag of allTags(); track tag) {
            <button 
              (click)="activeTag.set(tag)"
              class="px-3 py-1 rounded-full text-sm font-medium border transition-colors"
              [class]="activeTag() === tag
                ? 'bg-primary text-white border-primary' 
                : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary'"
            >
              {{ tag }}
            </button>
         }
      </div>

      <!-- Content -->
      @if (filteredArticles().length === 0) {
         <div class="py-20 text-center text-slate-500">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">feed</span>
            <p>{{ t.map()['NO_RESULTS'] }}</p>
         </div>
      } @else {
         @if (viewMode() === 'grid') {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
               @for (article of filteredArticles(); track article.id) {
                  <app-article-card [article]="article" layout="grid"></app-article-card>
               }
            </div>
         } @else {
            <div class="space-y-4 animate-fade-in">
               @for (article of filteredArticles(); track article.id) {
                  <app-article-card [article]="article" layout="list"></app-article-card>
               }
            </div>
         }
      }
    </div>
  `
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
       list = list.filter(a => a.tags.includes(tag));
    }

    if (query) {
       list = list.filter(a => 
          this.i18n.resolve(a.title).toLowerCase().includes(query) || 
          this.i18n.resolve(a.summary).toLowerCase().includes(query)
       );
    }

    return list;
  });
}
