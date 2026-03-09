import { Component, input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe, NgTemplateOutlet, NgOptimizedImage } from '@angular/common';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { ArticleMetadata } from '../../data/article-registry';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-article-card',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, NgTemplateOutlet, NgOptimizedImage, LocalLinkPipe],
  template: `
    <!-- External Link Variant -->
    @if (isExternal()) {
      <a
        [href]="article().url"
        target="_blank"
        rel="noopener noreferrer"
        class="glass-surface glass-surface-hover group/article isolate block overflow-hidden rounded-2xl transition-all duration-300"
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
        [routerLink]="['/articles', article().id] | localLink"
        class="glass-surface glass-surface-hover group/article isolate block overflow-hidden rounded-2xl transition-all duration-300"
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
        class="relative shrink-0 overflow-hidden bg-slate-200 dark:bg-slate-700"
        [class.h-48]="layout() === 'grid'"
        [class.w-full]="layout() === 'grid'"
        [class.w-32]="layout() === 'list'"
        [class.sm:w-48]="layout() === 'list'"
        [class.h-full]="layout() === 'list'"
        [class.min-h-32]="layout() === 'list'"
      >
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
          <div
            class="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold shadow-sm backdrop-blur dark:bg-slate-900/90"
          >
            <span>EXT</span>
            <span class="material-symbols-outlined text-sm">open_in_new</span>
          </div>
        }

        <!-- Reading Time (Grid Only) -->
        @if (layout() === 'grid') {
          <div
            class="absolute right-3 bottom-3 z-10 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
          >
            {{ article().readingTime }} min
          </div>
        }
      </div>

      <!-- Content -->
      <div class="flex flex-1 flex-col p-5">
        <div class="mb-2 flex flex-wrap gap-2">
          @for (tag of article().tags.slice(0, 3); track tag) {
            <span
              class="text-primary bg-primary/5 border-primary/10 rounded border px-2 py-1 text-[10px] font-bold tracking-wider uppercase"
            >
              {{ tag }}
            </span>
          }
        </div>

        <h3
          class="group-hover/article:text-primary mb-2 leading-tight font-bold text-slate-900 transition-colors dark:text-white"
          [class.text-xl]="layout() === 'grid'"
          [class.text-lg]="layout() === 'list'"
        >
          {{ i18n.resolve(article().title) }}
        </h3>

        <p class="mb-4 line-clamp-3 flex-1 text-sm text-slate-500 dark:text-slate-400">
          {{ i18n.resolve(article().summary) }}
        </p>

        <div
          class="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400 dark:border-slate-700"
        >
          <div class="flex items-center gap-2">
            <span class="font-medium text-slate-600 dark:text-slate-300">{{
              article().author
            }}</span>
            @if (layout() === 'list') {
              <span>•</span>
              <span>{{ article().readingTime }} min</span>
            }
          </div>
          <span>{{ article().date | date: 'mediumDate' }}</span>
        </div>
      </div>
    </ng-template>
  `,
})
export class ArticleCardComponent {
  article = input.required<ArticleMetadata>();
  layout = input<'grid' | 'list'>('grid');
  priority = input<boolean>(false);

  i18n = inject(I18nService);

  isExternal = computed(() => this.article().type === 'external');
}
