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
    // URL is the Source of Truth
    // Listen to navigation events to determine the language from the URL
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const foundLang = this.findLangInRoute(this.route.snapshot);
      if (foundLang && this.isSupported(foundLang)) {
        this.currentLang.set(foundLang as Language);
      }
    });

    effect(() => {
      const lang = this.currentLang();
      
      document.documentElement.lang = lang;

      try {
        localStorage.setItem(this.storageKey, lang);
        this.db.config.write(this.storageKey, lang);
      } catch (e) {
        console.warn('Failed to save language preference', e);
      }
    });
  }


  getStartupLanguage(): Language {
     // 1. Try LocalStorage (Sync)
     try {
       const saved = localStorage.getItem(this.storageKey);
       if (saved && this.isSupported(saved)) {
         return saved as Language;
       }
     } catch { /* ignore */ }

     return this.getBrowserLang();
  }
  
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
    const url = this.router.url;
    const currentLang = this.currentLang();
    const newUrl = url.replace(`/${currentLang}`, `/${lang}`);
    
    const target = newUrl !== url ? newUrl : `/${lang}`;
    
    this.router.navigateByUrl(target);
  }

  reset() {
    const defaultLang = this.getStartupLanguage();
    this.setLanguage(defaultLang);
  }

  private isSupported(lang: string): boolean {
    return this.supportedLanguages.some(l => l.code === lang);
  }

  private getBrowserLang(): Language {
     const browserLang = navigator.language.split('-')[0];
     const match = this.supportedLanguages.find(l => l.code === browserLang);
     return match ? match.code : 'en';
  }

  resolve(text: I18nText | undefined | null): string {
    if (!text) return '';
    if (typeof text === 'string') return text;
    
    const lang = this.currentLang();
    return text[lang] || text['en'] || Object.values(text)[0] || '';
  }
}