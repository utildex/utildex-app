import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPrefKey } from '../core/storage-keys';
import { createRouteSnapshot, flushPromises } from '../testing/service-test-helpers';
import { DbService } from './db.service';
import { PersistenceService } from './persistence.service';

describe('PersistenceService', () => {
  let db: {
    config: {
      read: ReturnType<typeof vi.fn>;
      write: ReturnType<typeof vi.fn>;
    };
  };
  let router: {
    url: string;
    parseUrl: ReturnType<typeof vi.fn>;
    navigate: ReturnType<typeof vi.fn>;
  };
  let route: { snapshot: { queryParams: Record<string, string> } };

  beforeEach(() => {
    vi.useFakeTimers();

    db = {
      config: {
        read: vi.fn().mockResolvedValue(undefined),
        write: vi.fn().mockResolvedValue(undefined),
      },
    };
    router = {
      url: '/tools?page=2',
      parseUrl: vi.fn().mockReturnValue({ queryParams: { page: '2' } }),
      navigate: vi.fn().mockResolvedValue(true),
    };
    route = { snapshot: { queryParams: {} } };

    TestBed.configureTestingModule({
      providers: [
        PersistenceService,
        { provide: DbService, useValue: db },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('hydrates existing localStorage values synchronously', () => {
    localStorage.setItem(getPrefKey('theme'), 'dark');
    const value = signal('light');

    TestBed.runInInjectionContext(() => {
      TestBed.inject(PersistenceService).storage(value, 'theme', {
        type: 'string',
        strategy: 'local',
      });
    });

    expect(value()).toBe('dark');
  });

  it('writes localStorage values after the debounce', async () => {
    const value = signal('light');

    TestBed.runInInjectionContext(() => {
      TestBed.inject(PersistenceService).storage(value, 'theme', {
        type: 'string',
        strategy: 'local',
      });
    });

    TestBed.tick();
    vi.clearAllTimers();
    value.set('dark');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(300);

    expect(localStorage.getItem(getPrefKey('theme'))).toBe('dark');
  });

  it('hydrates IndexedDB values asynchronously', async () => {
    db.config.read.mockResolvedValue('42');
    const value = signal(0);

    TestBed.runInInjectionContext(() => {
      TestBed.inject(PersistenceService).storage(value, 'answer', {
        type: 'number',
        strategy: 'idb',
      });
    });

    await flushPromises();

    expect(value()).toBe(42);
  });

  it('uses hybrid localStorage hydration and writes to both stores', async () => {
    localStorage.setItem(getPrefKey('prefs'), JSON.stringify({ density: 'compact' }));
    db.config.read.mockResolvedValue(JSON.stringify({ density: 'comfortable' }));
    const value = signal({ density: 'default' });

    TestBed.runInInjectionContext(() => {
      TestBed.inject(PersistenceService).storage(value, 'prefs', {
        type: 'object',
        strategy: 'hybrid',
      });
    });

    expect(value()).toEqual({ density: 'compact' });

    await flushPromises();
    expect(value()).toEqual({ density: 'comfortable' });

    db.config.write.mockClear();
    vi.clearAllTimers();
    value.set({ density: 'spacious' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(300);

    expect(localStorage.getItem(getPrefKey('prefs'))).toBe(JSON.stringify({ density: 'spacious' }));
    expect(db.config.write).toHaveBeenCalledWith(
      getPrefKey('prefs'),
      JSON.stringify({ density: 'spacious' }),
    );
  });

  it('keeps the default value for corrupt JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.setItem(getPrefKey('prefs'), '{nope');
    const value = signal({ ok: true });

    TestBed.runInInjectionContext(() => {
      TestBed.inject(PersistenceService).storage(value, 'prefs', {
        type: 'object',
        strategy: 'local',
      });
    });

    expect(value()).toEqual({ ok: true });
    expect(warn).toHaveBeenCalledWith('[Persistence] JSON parse failed', expect.any(SyntaxError));
  });

  it('debounces rapid writes to the final value', async () => {
    const value = signal('one');

    TestBed.runInInjectionContext(() => {
      TestBed.inject(PersistenceService).storage(value, 'query', {
        type: 'string',
        strategy: 'local',
      });
    });

    TestBed.tick();
    vi.clearAllTimers();
    value.set('two');
    value.set('three');
    value.set('four');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(299);
    expect(localStorage.getItem(getPrefKey('query'))).toBeNull();

    await vi.advanceTimersByTimeAsync(1);

    expect(localStorage.getItem(getPrefKey('query'))).toBe('four');
  });

  it('keeps multiple keys isolated', async () => {
    const first = signal('a');
    const second = signal('b');
    const service = TestBed.inject(PersistenceService);

    TestBed.runInInjectionContext(() => {
      service.storage(first, 'first', { type: 'string', strategy: 'local' });
      service.storage(second, 'second', { type: 'string', strategy: 'local' });
    });

    TestBed.tick();
    vi.clearAllTimers();
    first.set('first-updated');
    second.set('second-updated');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(300);

    expect(localStorage.getItem(getPrefKey('first'))).toBe('first-updated');
    expect(localStorage.getItem(getPrefKey('second'))).toBe('second-updated');
  });

  it('hydrates and writes URL query parameters', async () => {
    route.snapshot = createRouteSnapshot() as typeof route.snapshot;
    route.snapshot.queryParams = { page: '2' };
    const page = signal(1);
    const service = TestBed.inject(PersistenceService);

    TestBed.runInInjectionContext(() => {
      service.url(page, 'page', 'number');
    });

    expect(page()).toBe(2);

    router.parseUrl.mockReturnValue({ queryParams: { page: '2' } });
    page.set(3);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(300);

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { page: 3 },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });
});
