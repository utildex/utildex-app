
import { Component, input, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe, NgTemplateOutlet, NgOptimizedImage } from '@angular/common';
import { ArticleMetadata } from '../../data/article-registry';
import { I18nService } from '../../services/i18n.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';

const en = { "READ_MORE": "Read Article", "OPEN_LINK": "Visit Link" };
const fr = { "READ_MORE": "Lire l'article", "OPEN_LINK": "Visiter le lien" };
const es = { "READ_MORE": "Leer artículo", "OPEN_LINK": "Visitar enlace" };
const zh = { "READ_MORE": "阅读文章", "OPEN_LINK": "访问链接" };

@Component({
  selector: 'app-article-card',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, NgTemplateOutlet, NgOptimizedImage],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <!-- External Link Variant -->
    @if (isExternal()) {
      <a 
        [href]="article().url"
        target="_blank"
        rel="noopener noreferrer"
        class="group/article block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-300 isolate"
        [class.flex-col]="layout() === 'grid'"
        [class.h-full]="layout() === 'grid'"
        [class.hover:-translate-y-2]="layout() === 'grid'"
        [class.flex]="layout() === 'list'"
        [class.flex-row]="layout() === 'list'"
        style="-webkit-mask-image: -webkit-radial-gradient(white, black);"
      >
        <ng-container *ngTemplateOutlet="cardContent"></ng-container>
      </a>
    } 
    <!-- Internal Router Link Variant -->
    @else {
      <a 
        [routerLink]="['/articles', article().id]"
        class="group/article block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-300 isolate"
        [class.flex-col]="layout() === 'grid'"
        [class.h-full]="layout() === 'grid'"
        [class.hover:-translate-y-2]="layout() === 'grid'"
        [class.flex]="layout() === 'list'"
        [class.flex-row]="layout() === 'list'"
        style="-webkit-mask-image: -webkit-radial-gradient(white, black);"
      >
        <ng-container *ngTemplateOutlet="cardContent"></ng-container>
      </a>
    }

    <!-- Shared Content Template -->
    <ng-template #cardContent>
      <!-- Thumbnail -->
      <div 
        class="relative overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0"
        [class.h-48]="layout() === 'grid'"
        [class.w-full]="layout() === 'grid'"
        [class.w-32]="layout() === 'list'"
        [class.sm:w-48]="layout() === 'list'"
        [class.h-full]="layout() === 'list'"
        [class.min-h-32]="layout() === 'list'"
      >
        <!-- Using NgOptimizedImage with fill mode for best container adaptation -->
        <img
            [ngSrc]="article().thumbnail"
            [alt]="i18n.resolve(article().title)"
            fill
            [priority]="priority()"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            class="object-cover transition-transform duration-500 group-hover/article:scale-105"
        />
        
        <!-- External Badge -->
        @if (article().type === 'external') {
           <div class="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 z-10">
              <span>EXT</span>
              <span class="material-symbols-outlined text-sm">open_in_new</span>
           </div>
        }
        
        <!-- Reading Time (Grid Only) -->
        @if (layout() === 'grid') {
          <div class="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur-sm z-10">
             {{ article().readingTime }} min
          </div>
        }
      </div>

      <!-- Content -->
      <div class="p-5 flex flex-col flex-1">
        <div class="flex flex-wrap gap-2 mb-2">
          @for (tag of article().tags.slice(0, 3); track tag) {
            <span class="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10">
              {{ tag }}
            </span>
          }
        </div>
        
        <h3 class="font-bold text-slate-900 dark:text-white mb-2 leading-tight group-hover/article:text-primary transition-colors"
          [class.text-xl]="layout() === 'grid'"
          [class.text-lg]="layout() === 'list'"
        >
          {{ i18n.resolve(article().title) }}
        </h3>
        
        <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-1">
          {{ i18n.resolve(article().summary) }}
        </p>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400 mt-auto">
          <div class="flex items-center gap-2">
             <span class="font-medium text-slate-600 dark:text-slate-300">{{ article().author }}</span>
             @if (layout() === 'list') {
               <span>•</span>
               <span>{{ article().readingTime }} min</span>
             }
          </div>
          <span>{{ article().date | date:'mediumDate' }}</span>
        </div>
      </div>
    </ng-template>
  `
})
export class ArticleCardComponent {
  article = input.required<ArticleMetadata>();
  layout = input<'grid' | 'list'>('grid');
  priority = input<boolean>(false);

  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);

  isExternal = computed(() => this.article().type === 'external');
}
