import { Injectable, signal, effect } from '@angular/core';

export type Language = 'en' | 'fr' | 'es' | 'zh';
export type I18nText = string | { [key: string]: string };

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  currentLang = signal<Language>('en');

  constructor() {
    // Load persisted language
    const saved = localStorage.getItem('utildex-lang') as Language;
    if (saved && ['en', 'fr', 'es', 'zh'].includes(saved)) {
      this.currentLang.set(saved);
    } else {
      // Simple browser detection
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'fr') {
        this.currentLang.set('fr');
      } else if (browserLang === 'es') {
        this.currentLang.set('es');
      } else if (browserLang === 'zh') {
        this.currentLang.set('zh');
      }
    }

    // Persist changes
    effect(() => {
      localStorage.setItem('utildex-lang', this.currentLang());
      // Update html lang attribute
      document.documentElement.lang = this.currentLang();
    });
  }

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
  }

  reset() {
     const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'fr') {
        this.currentLang.set('fr');
      } else if (browserLang === 'es') {
        this.currentLang.set('es');
      } else if (browserLang === 'zh') {
        this.currentLang.set('zh');
      } else {
        this.currentLang.set('en');
      }
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