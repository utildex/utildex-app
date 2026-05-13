import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '../testing/service-test-helpers';
import { I18nService } from '../services/i18n.service';
import { I18N_MAP, ScopedTranslationService, type I18nMap } from './i18n';

describe('ScopedTranslationService', () => {
  const currentLang = signal('fr');

  beforeEach(() => {
    currentLang.set('fr');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function configure(map: I18nMap) {
    TestBed.configureTestingModule({
      providers: [
        ScopedTranslationService,
        { provide: I18N_MAP, useValue: map },
        { provide: I18nService, useValue: { currentLang } },
      ],
    });
  }

  it('loads translations for the requested language', async () => {
    configure({
      fr: () => ({ greeting: 'Bonjour' }),
      en: () => ({ greeting: 'Hello' }),
    });

    const service = TestBed.inject(ScopedTranslationService);
    TestBed.tick();
    await flushPromises();

    expect(service.get('greeting')).toBe('Bonjour');
  });

  it('falls back to English when the target language loader is missing', async () => {
    configure({ en: () => ({ greeting: 'Hello' }) });

    const service = TestBed.inject(ScopedTranslationService);
    TestBed.tick();
    await flushPromises();

    expect(service.get('greeting')).toBe('Hello');
  });

  it('falls back to English when the target language loader fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    configure({
      fr: () => Promise.reject(new Error('missing chunk')),
      en: () => ({ default: { greeting: 'Hello' } }),
    });

    const service = TestBed.inject(ScopedTranslationService);
    TestBed.tick();
    await flushPromises();

    expect(service.get('greeting')).toBe('Hello');
    expect(error).toHaveBeenCalledWith(
      "[I18n] Failed to load translations for 'fr'",
      expect.any(Error),
    );
  });

  it('returns the key for missing translations', async () => {
    configure({ fr: () => ({ greeting: 'Bonjour' }) });

    const service = TestBed.inject(ScopedTranslationService);
    TestBed.tick();
    await flushPromises();

    expect(service.get('missing.key')).toBe('missing.key');
  });
});
