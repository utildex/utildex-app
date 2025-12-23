
import { Injectable, inject, effect } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ToolService } from './tool.service';
import { ArticleService } from './article.service';
import { I18nService } from './i18n.service';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private title: Title = inject(Title);
  private meta: Meta = inject(Meta);
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private toolService = inject(ToolService);
  private articleService = inject(ArticleService);
  private i18n = inject(I18nService);

  constructor() {
    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSeo();
    });

    // Re-run SEO update when language changes
    effect(() => {
      // Access signal to register dependency
      this.i18n.currentLang(); 
      this.updateSeo();
    });
  }

  private updateSeo() {
    let currentRoute = this.route;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const url = this.router.url;
    let title = 'Utildex - Local-First Modular Toolbox';
    let desc = 'A modular collection of independent utilities that run entirely in your browser. Private, offline-ready, and open source.';
    let image = ''; // Default OG Image if available

    // 1. Tool Route
    if (url.startsWith('/tools/')) {
      const toolId = url.split('/tools/')[1]?.split('?')[0];
      const tool = this.toolService.tools().find(t => t.id === toolId);
      
      if (tool) {
        title = `${this.i18n.resolve(tool.name)} - Utildex`;
        desc = this.i18n.resolve(tool.description);
      }
    } 
    // 2. Article Route
    else if (url.startsWith('/articles/')) {
      const articleId = url.split('/articles/')[1]?.split('?')[0];
      // Only if it's a detail view (has ID)
      if (articleId) {
        const article = this.articleService.getById(articleId);
        if (article) {
          title = `${this.i18n.resolve(article.title)} - Utildex`;
          desc = this.i18n.resolve(article.summary);
          image = article.thumbnail;
        }
      } else {
        title = 'Articles - Utildex';
        desc = 'Guides, tutorials, and insights on local-first development.';
      }
    }
    // 3. Fallback to Route Data
    else {
      const routeTitle = currentRoute.snapshot.title;
      if (routeTitle) {
        title = routeTitle;
      }
    }

    // Apply Tags
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: desc });
    
    // OpenGraph
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: window.location.href });
    
    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
    } else {
      this.meta.removeTag("property='og:image'");
    }
  }
}
