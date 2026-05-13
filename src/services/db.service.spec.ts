import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DbService, type DbRecord } from './db.service';

describe('DbService', () => {
  const realIndexedDb = globalThis.indexedDB;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: realIndexedDb,
    });

    try {
      await TestBed.inject(DbService).clear();
    } catch {
      // A fallback-mode service may not have opened the fake IndexedDB database.
    }

    vi.restoreAllMocks();
  });

  it('can be created under TestBed', () => {
    expect(TestBed.inject(DbService)).toBeTruthy();
  });

  it('round trips config values through IndexedDB', async () => {
    const service = TestBed.inject(DbService);

    await service.set('theme', { mode: 'dark' });

    await expect(service.get('theme')).resolves.toEqual({ mode: 'dark' });
  });

  it('keeps config, records, and blobs isolated', async () => {
    const service = TestBed.inject(DbService);
    const blob = new Blob(['hello'], { type: 'text/plain' });

    await service.config.write('shared-key', 'config-value');
    const recordId = await service.records.add('tools.password-generator', { length: 24 });
    await service.blobs.put('shared-key', blob);

    await expect(service.config.read('shared-key')).resolves.toBe('config-value');
    await expect(service.records.list('tools.password-generator')).resolves.toMatchObject([
      { id: recordId, scope: 'tools.password-generator', data: { length: 24 } },
    ] satisfies Partial<DbRecord>[]);
    await expect(service.blobs.get('shared-key')).resolves.toBeDefined();
  });

  it('deletes existing and missing keys without throwing', async () => {
    const service = TestBed.inject(DbService);

    await service.set('ephemeral', 'value');
    await expect(service.delete('ephemeral')).resolves.toBeUndefined();
    await expect(service.delete('missing-key')).resolves.toBeUndefined();
    await expect(service.get('ephemeral')).resolves.toBeUndefined();
  });

  it('returns config keys from the service API', async () => {
    const service = TestBed.inject(DbService);

    await service.set('alpha', 1);
    await service.set('beta', 2);

    await expect(service.keys()).resolves.toEqual(expect.arrayContaining(['alpha', 'beta']));
  });

  it('falls back to in-memory storage when IndexedDB open throws', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: {
        open: () => {
          throw new Error('IndexedDB unavailable');
        },
      },
    });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = TestBed.inject(DbService);

    await service.set('fallback-key', { ok: true });

    await expect(service.get('fallback-key')).resolves.toEqual({ ok: true });
    expect((service as unknown as { isInMemory: boolean }).isInMemory).toBe(true);
    expect(warn).toHaveBeenCalledWith('IDB Access Denied. using Memory.');
  });
});
