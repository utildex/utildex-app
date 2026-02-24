import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ARTICLE_REGISTRY, ArticleMetadata } from '../data/article-registry';
import { I18nService, Language } from './i18n.service';

@Injectable({
  providedIn: 'root',
})
export class ArticleService {
  private http: HttpClient = inject(HttpClient);
  private i18n = inject(I18nService);

  private registry = signal<ArticleMetadata[]>(ARTICLE_REGISTRY);

  featuredArticles = computed(() => {
    return this.registry()
      .filter((a) => a.featured)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  recentArticles = computed(() => {
    return this.registry().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  allTags = computed(() => {
    const tags = new Set<string>();
    this.registry().forEach((a) => a.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  });

  getById(id: string): ArticleMetadata | undefined {
    return this.registry().find((a) => a.id === id);
  }

  fetchContent(id: string, lang?: Language): Observable<string | null> {
    const targetLang = lang || this.i18n.currentLang();
    const path = `assets/articles/${id}/${targetLang}.md`;

    return this.http.get(path, { responseType: 'text' }).pipe(catchError(() => of(null)));
  }
}
