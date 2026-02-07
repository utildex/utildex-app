import { Injectable, signal, effect, inject } from '@angular/core';
import languages from '../data/languages.json';
import { PersistenceService } from './persistence.service';

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
  private persistence = inject(PersistenceService);

  currentLang = signal<Language>('en');

  readonly supportedLanguages = languages as LanguageInfo[];

  constructor() {
    // Note: We removed the auto-loader here.
    // The source of truth is now the URL (via LanguageGuard).
    // But we still persist to LocalStorage via 'hybrid' strategy for root redirects.
    
    // Set default to browser lang before persistence loads (to avoid 'en' default if nothing saved)
    this.currentLang.set(this.getBrowserLang());

    this.persistence.storage(this.currentLang, 'lang', { strategy: 'hybrid' });

    // Persist changes
    effect(() => {
      // Manual sync removed (handled by persistence)
      // Update html lang attribute
      document.documentElement.lang = this.currentLang();
    });
  }

  getSavedOrBrowserLang(): Language {
     // PersistenceService has already loaded the saved value into currentLang synchronously if available
     return this.currentLang();
  }


  setLanguage(lang: Language) {
    this.currentLang.set(lang);
  }

  reset() {
    this.currentLang.set(this.getBrowserLang());
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