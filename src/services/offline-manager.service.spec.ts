import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '../testing/service-test-helpers';
import { DbService } from './db.service';
import { GuideService } from './guide.service';
import { OfflineManagerService } from './offline-manager.service';
import { PersistenceService } from './persistence.service';

const offlineMocks = vi.hoisted(() => {
  const createEntry = () => ({
    component: vi.fn().mockResolvedValue(class TestToolComponent {}),
    contract: vi.fn().mockResolvedValue({ id: 'tool', metadata: {} }),
    kernel: vi.fn().mockResolvedValue({}),
  });

  return {
    registry: {
      alpha: createEntry(),
      beta: createEntry(),
    },
    routeLoader: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../core/tool-registry', () => ({
  TOOL_REGISTRY_MAP: offlineMocks.registry,
}));

vi.mock('./offline-route-loaders', () => ({
  OFFLINE_ROUTE_LOADERS: [offlineMocks.routeLoader],
}));

describe('OfflineManagerService', () => {
  let db: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let guide: { notify: ReturnType<typeof vi.fn> };
  let serviceWorkerDescriptor: PropertyDescriptor | undefined;
  let onLineDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    for (const entry of Object.values(offlineMocks.registry)) {
      entry.component.mockClear().mockResolvedValue(class TestToolComponent {});
      entry.contract.mockClear().mockResolvedValue({ id: 'tool', metadata: {} });
      entry.kernel.mockClear().mockResolvedValue({});
    }
    offlineMocks.routeLoader.mockClear().mockResolvedValue(undefined);

    db = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    };
    guide = { notify: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        OfflineManagerService,
        { provide: DbService, useValue: db },
        { provide: GuideService, useValue: guide },
        { provide: PersistenceService, useValue: { storage: vi.fn() } },
      ],
    });
  });

  afterEach(() => {
    if (serviceWorkerDescriptor) {
      Object.defineProperty(window.navigator, 'serviceWorker', serviceWorkerDescriptor);
    } else {
      delete (window.navigator as Partial<Navigator> & { serviceWorker?: unknown }).serviceWorker;
    }
    if (onLineDescriptor) {
      Object.defineProperty(window.navigator, 'onLine', onLineDescriptor);
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function finishDownload(promise: Promise<void>) {
    await flushPromises();
    await vi.advanceTimersByTimeAsync(150);
    await promise;
  }

  it('can be created', () => {
    expect(TestBed.inject(OfflineManagerService)).toBeTruthy();
  });

  it('downloads missing tools and updates status', async () => {
    const service = TestBed.inject(OfflineManagerService);

    const download = service.downloadLibrary();

    expect(service.isDownloading()).toBe(true);
    await finishDownload(download);

    expect(service.isDownloading()).toBe(false);
    expect(service.downloadedTools()).toEqual(new Set(['alpha', 'beta']));
    expect(service.progress()).toBe(100);
    expect(guide.notify).toHaveBeenCalledWith('NOTIFY_LIB_DOWNLOADED', 6000);
  });

  it('dedupes repeated library downloads while one is in progress', async () => {
    const service = TestBed.inject(OfflineManagerService);

    const first = service.downloadLibrary();
    const second = service.downloadLibrary();

    await second;
    await finishDownload(first);

    expect(offlineMocks.registry.alpha.component).toHaveBeenCalledTimes(1);
    expect(offlineMocks.registry.beta.component).toHaveBeenCalledTimes(1);
  });

  it('cancels an in-progress download without crashing', async () => {
    const service = TestBed.inject(OfflineManagerService);

    const download = service.downloadLibrary();
    await flushPromises();
    service.cancelDownload();
    expect(service.isStopping()).toBe(true);

    await finishDownload(download);

    expect(service.isDownloading()).toBe(false);
    expect(service.isStopping()).toBe(false);
  });

  it('reports partial success when a tool fails to cache', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    offlineMocks.registry.beta.kernel.mockRejectedValue(new Error('chunk failed'));
    const service = TestBed.inject(OfflineManagerService);

    await finishDownload(service.downloadLibrary());

    expect(service.downloadedTools()).toEqual(new Set(['alpha']));
    expect(warn).toHaveBeenCalledWith('Failed to fully cache tool: beta');
    expect(guide.notify).toHaveBeenCalledWith('NOTIFY_LIB_PARTIAL', 7000);
  });

  it('uses requestIdleCallback for smart loading', () => {
    const idle = vi.spyOn(window, 'requestIdleCallback');
    const service = TestBed.inject(OfflineManagerService);

    service.smartDownloadEnabled.set(true);
    TestBed.tick();

    expect(idle).toHaveBeenCalled();
  });

  it('sets the service worker reload flag at most once', () => {
    serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'serviceWorker');
    onLineDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: null },
    });
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    const service = TestBed.inject(OfflineManagerService) as unknown as {
      scheduleServiceWorkerActivationReload: () => boolean;
    };

    expect(service.scheduleServiceWorkerActivationReload()).toBe(true);
    expect(sessionStorage.getItem('offline-sw-activation-reload')).toBe('1');
    expect(service.scheduleServiceWorkerActivationReload()).toBe(false);
  });
});
