
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ARTICLE_REGISTRY, ArticleMetadata } from '../data/article-registry';
import { I18nService } from './i18n.service';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private http: HttpClient = inject(HttpClient);
  private i18n = inject(I18nService);

  // Registry State
  private registry = signal<ArticleMetadata[]>(ARTICLE_REGISTRY);

  // Computed Lists
  featuredArticles = computed(() => {
    return this.registry()
      .filter(a => a.featured)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  recentArticles = computed(() => {
    return this.registry()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  allTags = computed(() => {
    const tags = new Set<string>();
    this.registry().forEach(a => a.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  });

  getById(id: string): ArticleMetadata | undefined {
    return this.registry().find(a => a.id === id);
  }

  /**
   * Fetches the markdown content for an article via HTTP.
   * This allows lazy-loading content only when requested.
   */
  fetchContent(id: string): Observable<string> {
    const lang = this.i18n.currentLang();
    const path = `assets/articles/${id}`;

    // 1. Try to fetch the requested language
    return this.http.get(`${path}/${lang}.md`, { responseType: 'text' }).pipe(
      // 2. If not found (404) and we aren't already asking for English, try English
      catchError(() => {
        if (lang !== 'en') {
          return this.http.get(`${path}/en.md`, { responseType: 'text' });
        }
        throw new Error('Not found');
      }),
      // 3. If still not found, return fallback message
      catchError(() => of(this.getNotFoundMessage()))
    );
  }

  private getNotFoundMessage(): string {
    return `
# Article Not Found

Sorry, the content for this article could not be loaded. 
It might not be available in your language yet, or you might be offline without a cached version.

[Back to Articles](#/articles)
    `;
  }
}
