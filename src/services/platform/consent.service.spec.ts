import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '../../testing/service-test-helpers';
import { DbService } from '../data/db.service';
import { ConsentService } from './consent.service';

const STORAGE_PREFIX = 'consent:';

describe('ConsentService', () => {
  let service: ConsentService;
  let dbConfig: { read: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();

    dbConfig = {
      read: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        ConsentService,
        { provide: DbService, useValue: { config: dbConfig } },
      ],
    });

    service = TestBed.inject(ConsentService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── ask() ─────────────────────────────────────────────────────────────

  it('should set state to prompt when asking for the first time', async () => {
    const config = createConfig();
    const promise = service.ask(config);
    await flushPromises();

    expect(service.state()).toEqual({
      phase: 'prompt',
      config,
      progress: 0,
    });
    // Zone.js wraps Promises, but they're still thenable
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(typeof (promise as Promise<unknown>).then).toBe('function');
  });

  it('should skip modal and return { consented: true } if already consented', async () => {
    dbConfig.read.mockResolvedValue({ consented: true, timestamp: Date.now() });

    const result = await service.ask(createConfig({ scope: 'already-consented' }));

    expect(result).toEqual({ consented: true });
    expect(service.state()).toBeNull();
    expect(dbConfig.read).toHaveBeenCalledWith(`${STORAGE_PREFIX}already-consented`);
  });

  // ─── hasConsented() ────────────────────────────────────────────────────

  it('should return true when stored consent exists', async () => {
    dbConfig.read.mockResolvedValue({ consented: true, timestamp: 1 });
    expect(await service.hasConsented('test-scope')).toBe(true);
  });

  it('should return false when no stored consent exists', async () => {
    dbConfig.read.mockResolvedValue(undefined);
    expect(await service.hasConsented('test-scope')).toBe(false);
  });

  it('should return false when stored consent is explicitly false', async () => {
    dbConfig.read.mockResolvedValue({ consented: false, timestamp: 1 });
    expect(await service.hasConsented('test-scope')).toBe(false);
  });

  // ─── consent() — happy path ────────────────────────────────────────────

  it('should transition through downloading → complete on successful download', async () => {
    const onProgress = vi.fn();
    const downloadAction = vi.fn().mockImplementation(
      (progressFn: (pct: number) => void) =>
        new Promise<void>((resolve) => {
          progressFn(50);
          progressFn(100);
          resolve();
        }),
    );

    const config = createConfig({ downloadAction: downloadAction as never });
    const resultPromise = service.ask(config);
    await flushPromises();

    expect(service.state()?.phase).toBe('prompt');

    // User clicks download
    await service.consent();
    await flushPromises();

    expect(service.state()?.phase).toBe('complete');
    expect(service.state()?.progress).toBe(100);
    expect(downloadAction).toHaveBeenCalledOnce();

    // Persisted
    expect(dbConfig.write).toHaveBeenCalledWith(
      `${STORAGE_PREFIX}test-scope`,
      expect.objectContaining({ consented: true }),
    );

    const result = await resultPromise;
    expect(result).toEqual({ consented: true });
  });

  // ─── consent() — error path ────────────────────────────────────────────

  it('should transition to error when downloadAction rejects', async () => {
    const downloadAction = vi.fn().mockRejectedValue(new Error('Network failure'));

    const config = createConfig({ downloadAction: downloadAction as never });
    service.ask(config);
    await flushPromises();

    await service.consent();
    await flushPromises();

    expect(service.state()?.phase).toBe('error');
    expect(service.state()?.error).toBe('Network failure');
  });

  it('should transition to error when downloadAction throws synchronously', async () => {
    const downloadAction = () => {
      throw new Error('Sync boom');
    };

    const config = createConfig({ downloadAction: downloadAction as never });
    service.ask(config);
    await flushPromises();

    await service.consent();
    await flushPromises();

    expect(service.state()?.phase).toBe('error');
    expect(service.state()?.error).toBe('Sync boom');
  });

  // ─── refuse() ──────────────────────────────────────────────────────────

  it('should transition to refused and resolve with { consented: false }', async () => {
    const resultPromise = service.ask(createConfig());
    await flushPromises();

    service.refuse();

    expect(service.state()?.phase).toBe('refused');
    const result = await resultPromise;
    expect(result).toEqual({ consented: false });
  });

  // ─── dismiss() ─────────────────────────────────────────────────────────

  it('should clear state on dismiss', async () => {
    service.ask(createConfig());
    await flushPromises();
    expect(service.state()).not.toBeNull();

    service.dismiss();
    expect(service.state()).toBeNull();
  });

  // ─── reportProgress() ──────────────────────────────────────────────────

  it('should clamp progress between 0 and 100', async () => {
    service.ask(createConfig());
    await flushPromises();
    service.state.set({ ...service.state()!, phase: 'downloading' });

    service.reportProgress(50);
    expect(service.state()?.progress).toBe(50);

    service.reportProgress(150);
    expect(service.state()?.progress).toBe(100);

    service.reportProgress(-10);
    expect(service.state()?.progress).toBe(0);
  });

  // ─── resetConsent() ────────────────────────────────────────────────────

  it('should delete stored consent decision', async () => {
    await service.resetConsent('test-scope');
    expect(dbConfig.delete).toHaveBeenCalledWith(`${STORAGE_PREFIX}test-scope`);
  });

  // ─── Auto-dismiss after complete ───────────────────────────────────────

  it('should auto-dismiss 2 seconds after completing', async () => {
    const downloadAction = vi.fn().mockResolvedValue(undefined);
    service.ask(createConfig({ downloadAction: downloadAction as never }));
    await flushPromises();

    await service.consent();
    await flushPromises();

    expect(service.state()?.phase).toBe('complete');

    vi.advanceTimersByTime(2000);
    await flushPromises();

    expect(service.state()).toBeNull();
  });

  // ─── consent() no-ops when state is null ───────────────────────────────

  it('should no-op on consent() when no modal is active', async () => {
    await service.consent();
    expect(service.state()).toBeNull();
  });

  it('should no-op on refuse() when no modal is active', () => {
    service.refuse();
    expect(service.state()).toBeNull();
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function createConfig(overrides: Partial<Parameters<ConsentService['ask']>[0]> = {}) {
  return {
    scope: 'test-scope',
    title: 'Test Download',
    description: 'This is a test download.',
    sizeLabel: '~10 MB',
    storageLabel: 'stored in your browser',
    icon: 'download',
    downloadAction: vi.fn().mockResolvedValue(undefined),
    refuseMessage: 'Cannot proceed without download.',
    ...overrides,
  };
}
