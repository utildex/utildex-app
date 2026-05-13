import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPrefKey } from '../core/storage-keys';
import { createRouteSnapshot } from '../testing/service-test-helpers';
import { DbService } from './db.service';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let events: Subject<unknown>;
  let router: { events: Subject<unknown>; url: string; navigateByUrl: ReturnType<typeof vi.fn> };
  let route: { snapshot: ReturnType<typeof createRouteSnapshot> };
  let languageDescriptor: PropertyDescriptor | undefined;

  function configure(language = 'en-US') {
    languageDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'language');
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: language,
    });

    events = new Subject<unknown>();
    router = {
      events,
      url: '/en/tools',
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    route = { snapshot: createRouteSnapshot() };

    TestBed.configureTestingModule({
      providers: [
        I18nService,
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        {
          provide: DbService,
          useValue: { config: { write: vi.fn().mockResolvedValue(undefined) } },
        },
      ],
    });
  }

  afterEach(() => {
    if (languageDescriptor) {
      Object.defineProperty(window.navigator, 'language', languageDescriptor);
    }
    vi.restoreAllMocks();
  });

  it('starts from a supported localStorage language', () => {
    localStorage.setItem(getPrefKey('lang'), 'fr');
    configure('es-ES');

    const service = TestBed.inject(I18nService);

    expect(service.currentLang()).toBe('fr');
  });

  it('falls back to browser language and then English for unsupported startup values', () => {
    localStorage.setItem(getPrefKey('lang'), 'nope');
    configure('de-DE');

    const service = TestBed.inject(I18nService);

    expect(service.currentLang()).toBe('en');
  });

  it('uses nested route language after navigation events', () => {
    configure('en-US');
    const child = createRouteSnapshot({ lang: 'es' });
    route.snapshot = createRouteSnapshot({}, child);
    const service = TestBed.inject(I18nService);

    events.next(new NavigationEnd(1, '/es/tools', '/es/tools'));

    expect(service.currentLang()).toBe('es');
  });

  it('ignores unsupported route languages safely', () => {
    configure('fr-FR');
    route.snapshot = createRouteSnapshot({ lang: 'klingon' });
    const service = TestBed.inject(I18nService);

    events.next(new NavigationEnd(1, '/klingon/tools', '/klingon/tools'));

    expect(service.currentLang()).toBe('fr');
  });

  it('navigates by replacing the current language segment', () => {
    configure('en-US');
    const service = TestBed.inject(I18nService);

    service.setLanguage('zh');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/zh/tools');
  });

  it('resolves translated text with safe fallbacks', () => {
    configure('en-US');
    const service = TestBed.inject(I18nService);

    service.currentLang.set('es');

    expect(service.resolve({ en: 'Hello', es: 'Hola' })).toBe('Hola');
    expect(service.resolve({ fr: 'Bonjour' })).toBe('Bonjour');
    expect(service.resolve(undefined)).toBe('');
  });
});
