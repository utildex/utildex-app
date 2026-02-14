import { Injectable, InjectionToken, inject, signal, effect } from '@angular/core';
import { I18nService } from '../services/i18n.service';

type TranslationModule = Record<string, string> | { default: Record<string, string> };
export type I18nMap = Record<string, () => Promise<TranslationModule> | TranslationModule>;
export const I18N_MAP = new InjectionToken<I18nMap>('I18N_MAP');

// Provides translation capabilities to a component
export function provideTranslation(map: I18nMap) {
  return [
    { provide: I18N_MAP, useValue: map },
    ScopedTranslationService
  ];
}

@Injectable()
export class ScopedTranslationService {
  private i18nService = inject(I18nService);
  private loaders = inject(I18N_MAP);
  private translations = signal<Record<string, string>>({});
  public map = this.translations.asReadonly();

  constructor() {
    effect(() => {
      const lang = this.i18nService.currentLang();
      this.load(lang);
    });
  }

  private async load(lang: string) {
    let loader = this.loaders[lang];
    if (!loader && lang !== 'en') {
      loader = this.loaders['en'];
    }
    if (loader) {
      try {
        const result = loader();
        const module = result instanceof Promise ? await result : result;
        const translations = ('default' in module ? module.default : module) as Record<string, string>;
        this.translations.set(translations);
      } catch (err) {
        console.error(`[I18n] Failed to load translations for '${lang}'`, err);
        if (lang !== 'en' && this.loaders['en']) {
          try {
            const fallbackResult = this.loaders['en']();
            const fallbackModule = fallbackResult instanceof Promise ? await fallbackResult : fallbackResult;
            const fallbackTranslations = ('default' in fallbackModule ? fallbackModule.default : fallbackModule) as Record<string, string>;
            this.translations.set(fallbackTranslations);
          } catch (fallbackErr) {
             console.error('[I18n] Failed to load fallback english translations', fallbackErr);
          }
        }
      }
    } else {
      console.warn(`[I18n] No loaders available for '${lang}'.`);
    }
  }

  // Get a translation by key. Returns the key if translation is missing.
  get(key: string): string {
    return this.translations()[key] || key;
  }
}