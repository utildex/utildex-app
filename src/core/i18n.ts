import { Injectable, InjectionToken, inject, signal, effect } from '@angular/core';
import { I18nService } from '../services/i18n.service';

// Change: Loader returns the data directly or a Promise
export type I18nMap = Record<string, () => Promise<any> | any>;

export const I18N_MAP = new InjectionToken<I18nMap>('I18N_MAP');

/**
 * Provides translation capabilities to a component.
 * Usage with static imports (Recommended for robustness):
 * import en from './i18n/en'; // Import from .ts file
 * providers: [
 *   provideTranslation({
 *     en: () => en,
 *     fr: () => import('./i18n/fr') // dynamic also supported if env allows
 *   })
 * ]
 */
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

  // Holds the current translation map
  private translations = signal<Record<string, string>>({});
  
  // Expose a signal that components can read from directly
  public map = this.translations.asReadonly();

  constructor() {
    // React to language changes
    effect(() => {
      const lang = this.i18nService.currentLang();
      this.load(lang);
    });
  }

  private async load(lang: string) {
    let loader = this.loaders[lang];

    // Immediate fallback check if specific lang loader is missing
    if (!loader && lang !== 'en') {
      loader = this.loaders['en'];
    }

    if (loader) {
      try {
        // Handle both Promise (dynamic import) and direct value (static import)
        const result = loader();
        const module = result instanceof Promise ? await result : result;
        this.translations.set(module.default || module);
      } catch (err) {
        console.error(`[I18n] Failed to load translations for '${lang}'`, err);
        // Try fallback if we haven't already
        if (lang !== 'en' && this.loaders['en']) {
          try {
            const fallbackResult = this.loaders['en']();
            const fallbackModule = fallbackResult instanceof Promise ? await fallbackResult : fallbackResult;
            this.translations.set(fallbackModule.default || fallbackModule);
          } catch (fallbackErr) {
             console.error('[I18n] Failed to load fallback english translations', fallbackErr);
          }
        }
      }
    } else {
      console.warn(`[I18n] No loaders available for '${lang}'.`);
    }
  }

  /**
   * Get a translation by key.
   * Returns the key if translation is missing.
   */
  get(key: string): string {
    return this.translations()[key] || key;
  }
}