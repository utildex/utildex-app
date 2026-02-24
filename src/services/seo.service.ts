import { Injectable, inject, effect } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ToolService } from './tool.service';
import { ArticleService } from './article.service';
import { I18nService } from './i18n.service';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private title: Title = inject(Title);
  private meta: Meta = inject(Meta);
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private toolService = inject(ToolService);
  private articleService = inject(ArticleService);
  private i18n = inject(I18nService);
  private document = inject(DOCUMENT);

  constructor() {
    // Listen to route changes
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updateSeo();
    });

    // Re-run SEO update when language changes
    effect(() => {
      // Access signal to register dependency
      this.i18n.currentLang();
      this.updateSeo();
      this.updateLangAttribute();
    });
  }

  private updateLangAttribute() {
    this.document.documentElement.lang = this.i18n.currentLang();
  }

  private updateCanonicalUrl() {
    const head = this.document.head;
    let link: HTMLLinkElement | null = head.querySelector("link[rel='canonical']");

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }

    // Construct clean URL (stripping query params for canonical)
    // We use window.location.origin to support whatever domain we are on,
    // unless you want to force 'https://utildex.com' even on dev/staging.
    // Ideally for SEO we want the production domain.
    const domain = 'https://utildex.com';
    const path = this.router.url.split('?')[0]; // Simple strip of query params

    link.setAttribute('href', domain + path);
  }

  private updateHreflangTags() {
    const head = this.document.head;
    const domain = 'https://utildex.com';
    const currentUrl = this.router.url.split('?')[0]; // Current path without queries

    // 1. Identify the "universal suffix" (path without language prefix)
    // Regex matches starts with slash, then 2 chars (language), then slash or end of string
    const langPrefixRegex = /^\/[a-z]{2}(\/|$)/;
    let urlSuffix = currentUrl.replace(langPrefixRegex, '/');
    if (!urlSuffix.startsWith('/')) urlSuffix = '/' + urlSuffix;

    // 2. Loop through all supported languages
    this.i18n.supportedLanguages.forEach((lang) => {
      // Find or create the tag
      let link: HTMLLinkElement | null = head.querySelector(`link[hreflang='${lang.code}']`);
      if (!link) {
        link = this.document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', lang.code);
        head.appendChild(link);
      }

      // Construct the URL: Domain + /code + suffix
      // Note: If suffix is '/', we get /en//. We should clean that up.
      const cleanPath = `/${lang.code}${urlSuffix}`.replace('//', '/');
      link.setAttribute('href', domain + cleanPath);
    });

    // 3. Handle x-default (usually 'en')
    let xDefault: HTMLLinkElement | null = head.querySelector(`link[hreflang='x-default']`);
    if (!xDefault) {
      xDefault = this.document.createElement('link');
      xDefault.setAttribute('rel', 'alternate');
      xDefault.setAttribute('hreflang', 'x-default');
      head.appendChild(xDefault);
    }
    const enPath = `/en${urlSuffix}`.replace('//', '/');
    xDefault.setAttribute('href', domain + enPath);
  }

  private updateJsonLd() {
    const head = this.document.head;
    let script: HTMLScriptElement | null = head.querySelector("script[type='application/ld+json']");

    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      head.appendChild(script);
    }

    const url = this.router.url;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let schema: any = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Utildex',
      url: 'https://utildex.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://utildex.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    };

    // 1. Tool Route
    if (url.startsWith('/tools/')) {
      const toolId = url.split('/tools/')[1]?.split('?')[0];
      const tool = this.toolService.tools().find((t) => t.id === toolId);

      if (tool) {
        schema = {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: this.i18n.resolve(tool.name),
          operatingSystem: 'Web Browser',
          applicationCategory: 'UtilityApplication',
          description: this.i18n.resolve(tool.description),
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          url: `https://utildex.com${url}`,
        };
      }
    }
    // 2. Article Route
    else if (url.startsWith('/articles/')) {
      const articleId = url.split('/articles/')[1]?.split('?')[0];
      if (articleId) {
        const article = this.articleService.getById(articleId);
        if (article) {
          schema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: this.i18n.resolve(article.title),
            image: article.thumbnail,
            author: {
              '@type': 'Person',
              name: article.author,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Utildex',
              logo: {
                '@type': 'ImageObject',
                url: 'https://utildex.com/assets/images/logo.png',
              },
            },
            datePublished: article.date,
            description: this.i18n.resolve(article.summary),
          };
        }
      }
    }

    script.textContent = JSON.stringify(schema);
  }

  private updateSeo() {
    this.updateCanonicalUrl();
    this.updateHreflangTags();
    this.updateJsonLd();

    let currentRoute = this.route;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const url = this.router.url;
    let title = 'Utildex - Local-First Modular Toolbox';
    let desc =
      'A modular collection of independent utilities that run entirely in your browser. Private, offline-ready, and source available.';
    let image = ''; // Default OG Image if available

    // 1. Tool Route
    if (url.startsWith('/tools/')) {
      const toolId = url.split('/tools/')[1]?.split('?')[0];
      const tool = this.toolService.tools().find((t) => t.id === toolId);

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
