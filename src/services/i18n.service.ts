import { Injectable, signal, effect, inject } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { filter } from 'rxjs/operators';
import languages from '../data/languages.json';
import { DbService } from './db.service';
import { getPrefKey } from '../core/storage-keys';

export type Language = 'en' | 'fr' | 'es' | 'zh';
export type I18nText = string | { [key: string]: string };

export interface LanguageInfo {
  code: Language;
  flagCode: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private db = inject(DbService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly supportedLanguages = languages as LanguageInfo[];
  private readonly storageKey = getPrefKey('lang');
  
  // Initialize with saved preference to prevent "Flash of Default" overwriting storage
  currentLang = signal<Language>(this.getStartupLanguage());

  constructor() {
    // 1. URL is the Source of Truth
    // Listen to navigation events to determine the language from the URL
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const foundLang = this.findLangInRoute(this.route.snapshot);
      if (foundLang && this.isSupported(foundLang)) {
        this.currentLang.set(foundLang as Language);
      }
    });

    // 2. Persist Preference (Write Only)
    // We never read from storage to set the active language (except for root redirect)
    effect(() => {
      const lang = this.currentLang();
      
      // Update HTML immediately
      document.documentElement.lang = lang;

      // Save preference
      try {
        localStorage.setItem(this.storageKey, lang);
        this.db.config.write(this.storageKey, lang);
      } catch (e) {
        console.warn('Failed to save language preference', e);
      }
    });
  }

  /**
   * Used by AppRoutes to determine where to redirect '/'
   */
  getStartupLanguage(): Language {
     // 1. Try LocalStorage (Sync)
     try {
       const saved = localStorage.getItem(this.storageKey);
       if (saved && this.isSupported(saved)) {
         return saved as Language;
       }
     } catch { /* ignore */ }

     // 2. Fallback to Browser
     return this.getBrowserLang();
  }
  
  // Helper to traverse the router tree to find ':lang' param
  private findLangInRoute(snapshot: ActivatedRouteSnapshot): string | null {
    let current: ActivatedRouteSnapshot | null = snapshot;
    while (current) {
      if (current.paramMap.has('lang')) {
        return current.paramMap.get('lang');
      }
      current = current.firstChild;
    }
    return null;
  }

  setLanguage(lang: Language) {
    // When manually setting language (e.g. from a picker), we rely on the Router
    // We don't set the signal directly; we navigate.
    const url = this.router.url;
    // Replace the current language segment in the URL
    // Assuming structure /:lang/...
    const currentLang = this.currentLang();
    const newUrl = url.replace(`/${currentLang}`, `/${lang}`);
    
    // If the URL didn't contain the lang (edge case), just go to root of new lang
    const target = newUrl !== url ? newUrl : `/${lang}`;
    
    this.router.navigateByUrl(target);
  }

  reset() {
    // Resetting usually means going back to default/detected
    const defaultLang = this.getStartupLanguage();
    this.setLanguage(defaultLang);
  }

  private isSupported(lang: string): boolean {
    return this.supportedLanguages.some(l => l.code === lang);
  }

  private getBrowserLang(): Language {
     const browserLang = navigator.language.split('-')[0];
     // Check if the browser language matches one of our supported codes
     const match = this.supportedLanguages.find(l => l.code === browserLang);
     return match ? match.code : 'en';
  }

  /**
   * Resolves a localized string based on the current language.
   * This method is reactive when used within a computed/effect context.
   */
  resolve(text: I18nText | undefined | null): string {
    if (!text) return '';
    if (typeof text === 'string') return text;
    
    const lang = this.currentLang();
    return text[lang] || text['en'] || Object.values(text)[0] || '';
  }
}