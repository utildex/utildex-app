import { Injectable, inject, effect } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ToolService } from './tool.service';
import { ArticleService } from './article.service';
import { I18nService } from './i18n.service';
import { AppConfigService } from './app-config.service';
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
  private appConfig = inject(AppConfigService);
  private document = inject(DOCUMENT);

  private noIndexPaths = new Set(['/my-dashboard', '/history', '/preview-banner']);

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

    const path = this.normalizeCurrentPath();

    link.setAttribute('href', this.appConfig.getPublicBaseUrl() + path);
  }

  private updateHreflangTags() {
    const head = this.document.head;
    const routeInfo = this.parseRoute();
    const urlSuffix = routeInfo.pathNoLang;

    this.i18n.supportedLanguages.forEach((lang) => {
      let link: HTMLLinkElement | null = head.querySelector(`link[hreflang='${lang.code}']`);
      if (!link) {
        link = this.document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', lang.code);
        head.appendChild(link);
      }

      const cleanPath = `/${lang.code}${urlSuffix}`.replace('//', '/');
      link.setAttribute('href', this.appConfig.getPublicBaseUrl() + cleanPath);
    });

    let xDefault: HTMLLinkElement | null = head.querySelector(`link[hreflang='x-default']`);
    if (!xDefault) {
      xDefault = this.document.createElement('link');
      xDefault.setAttribute('rel', 'alternate');
      xDefault.setAttribute('hreflang', 'x-default');
      head.appendChild(xDefault);
    }
    const enPath = `/en${urlSuffix}`.replace('//', '/');
    xDefault.setAttribute('href', this.appConfig.getPublicBaseUrl() + enPath);
  }

  private updateJsonLd() {
    const head = this.document.head;
    let script: HTMLScriptElement | null = head.querySelector("script[type='application/ld+json']");

    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      head.appendChild(script);
    }

    const routeInfo = this.parseRoute();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let schema: any = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.appConfig.appName,
      url: this.appConfig.getPublicBaseUrl(),
    };

    if (routeInfo.kind === 'tool' && routeInfo.toolId) {
      const tool = this.toolService.tools().find((t) => t.id === routeInfo.toolId);

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
          url: `${this.appConfig.getPublicBaseUrl()}${routeInfo.path}`,
        };
      }
    } else if (routeInfo.kind === 'article' && routeInfo.articleId) {
      const article = this.articleService.getById(routeInfo.articleId);
      if (article) {
        schema = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: this.i18n.resolve(article.title),
          image: this.toAbsoluteUrl(article.thumbnail),
          author: {
            '@type': 'Person',
            name: article.author,
          },
          publisher: {
            '@type': 'Organization',
            name: this.appConfig.appName,
            logo: {
              '@type': 'ImageObject',
              url: `${this.appConfig.getPublicBaseUrl()}/assets/images/logo.png`,
            },
          },
          datePublished: article.date,
          description: this.i18n.resolve(article.summary),
          mainEntityOfPage: `${this.appConfig.getPublicBaseUrl()}${routeInfo.path}`,
        };
      }
    }

    script.textContent = JSON.stringify(schema);
  }

  private updateSeo() {
    const routeInfo = this.parseRoute();

    this.updateCanonicalUrl();
    this.updateHreflangTags();
    this.updateJsonLd();
    this.updateRobotsPolicy(routeInfo);

    let currentRoute = this.route;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    let title = `${this.appConfig.appName} - Local-First Modular Toolbox`;
    let desc =
      `A modular collection of independent utilities and games that run entirely in your browser. Private, offline-ready, and source available.`;
    let image = ''; // Default OG Image if available

    if (routeInfo.kind === 'tool' && routeInfo.toolId) {
      const tool = this.toolService.tools().find((t) => t.id === routeInfo.toolId);

      if (tool) {
        title = `${this.i18n.resolve(tool.name)} - ${this.appConfig.appName}`;
        desc = this.i18n.resolve(tool.description);
      }
    } else if (routeInfo.kind === 'article') {
      const article = routeInfo.articleId ? this.articleService.getById(routeInfo.articleId) : null;
      if (article) {
        title = `${this.i18n.resolve(article.title)} - ${this.appConfig.appName}`;
        desc = this.i18n.resolve(article.summary);
        image = this.toAbsoluteUrl(article.thumbnail);
      } else {
        title = `Articles - ${this.appConfig.appName}`;
        desc = `Guides, tutorials, and insights for ${this.appConfig.appName}.`;
      }
    } else {
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
    this.meta.updateTag({
      property: 'og:url',
      content: `${this.appConfig.getPublicBaseUrl()}${routeInfo.path}`,
    });

    // Keep Twitter metadata aligned for static-host scraping fallbacks.
    this.meta.updateTag({ property: 'twitter:title', content: title });
    this.meta.updateTag({ property: 'twitter:description', content: desc });
    this.meta.updateTag({
      property: 'twitter:url',
      content: `${this.appConfig.getPublicBaseUrl()}${routeInfo.path}`,
    });

    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
      this.meta.updateTag({ property: 'twitter:image', content: image });
    } else {
      this.meta.removeTag("property='og:image'");
      this.meta.removeTag("property='twitter:image'");
    }
  }

  private normalizeCurrentPath(): string {
    const raw = this.router.url || '/';
    const noHash = raw.split('#')[0] || '/';
    const noQuery = noHash.split('?')[0] || '/';
    return noQuery.startsWith('/') ? noQuery : `/${noQuery}`;
  }

  private parseRoute(): {
    path: string;
    pathNoLang: string;
    lang: string | null;
    kind: 'tool' | 'article' | 'other';
    toolId?: string;
    articleId?: string;
  } {
    const path = this.normalizeCurrentPath();
    const segments = path.split('/').filter(Boolean);

    let lang: string | null = null;
    const supported = new Set<string>(this.i18n.supportedLanguages.map((l) => l.code));
    if (segments[0] && supported.has(segments[0])) {
      lang = segments.shift()!;
    }

    const pathNoLang = segments.length > 0 ? `/${segments.join('/')}` : '/';

    if (segments[0] === 'tools' && segments[1]) {
      return {
        path,
        pathNoLang,
        lang,
        kind: 'tool',
        toolId: decodeURIComponent(segments[1]),
      };
    }

    if (segments[0] === 'articles') {
      return {
        path,
        pathNoLang,
        lang,
        kind: 'article',
        articleId: segments[1] ? decodeURIComponent(segments[1]) : undefined,
      };
    }

    return { path, pathNoLang, lang, kind: 'other' };
  }

  private updateRobotsPolicy(routeInfo: { pathNoLang: string }) {
    const isNoIndex = this.noIndexPaths.has(routeInfo.pathNoLang);
    this.meta.updateTag({
      name: 'robots',
      content: isNoIndex ? 'noindex, nofollow' : 'index, follow',
    });
  }

  private toAbsoluteUrl(url: string): string {
    return this.appConfig.toAbsoluteUrl(url);
  }
}
