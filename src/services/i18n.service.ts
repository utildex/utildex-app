import { Injectable, signal, effect } from '@angular/core';

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
  currentLang = signal<Language>('en');

  readonly supportedLanguages: LanguageInfo[] = [
    { code: 'en', flagCode: 'us', label: 'English' },
    { code: 'fr', flagCode: 'fr', label: 'Français' },
    { code: 'es', flagCode: 'es', label: 'Español' },
    { code: 'zh', flagCode: 'cn', label: '中文' }
  ];

  constructor() {
    // Note: We removed the auto-loader here.
    // The source of truth is now the URL (via LanguageGuard).
    // LocalStorage is only used to 'remember' preference in the root redirect.
    
    // Persist changes
    effect(() => {
      // When the URL changes the language, we save it for next time
      localStorage.setItem('utildex-lang', this.currentLang());
      // Update html lang attribute
      document.documentElement.lang = this.currentLang();
    });
  }

  getSavedOrBrowserLang(): Language {
     const saved = localStorage.getItem('utildex-lang') as Language;
     if (saved && this.isSupported(saved)) return saved;
     return this.getBrowserLang();
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