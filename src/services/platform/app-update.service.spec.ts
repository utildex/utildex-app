import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  let versionUpdates: Subject<VersionEvent>;
  let swUpdate: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    checkForUpdate: ReturnType<typeof vi.fn>;
    activateUpdate: ReturnType<typeof vi.fn>;
  };
  let onLineDescriptor: PropertyDescriptor | undefined;
  let visibilityDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    onLineDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    versionUpdates = new Subject<VersionEvent>();
    swUpdate = {
      isEnabled: true,
      versionUpdates,
      checkForUpdate: vi.fn().mockResolvedValue(false),
      activateUpdate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [AppUpdateService, { provide: SwUpdate, useValue: swUpdate }],
    });
  });

  afterEach(() => {
    if (onLineDescriptor) {
      Object.defineProperty(window.navigator, 'onLine', onLineDescriptor);
    }
    if (visibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reacts to VERSION_READY events', () => {
    const service = TestBed.inject(AppUpdateService);

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'current' },
      latestVersion: { hash: 'latest' },
    });

    expect(service.isUpdateAvailable()).toBe(true);
  });

  it('checks for updates on an interval', () => {
    TestBed.inject(AppUpdateService);
    swUpdate.checkForUpdate.mockClear();

    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('checks for updates when the browser comes online', () => {
    TestBed.inject(AppUpdateService);
    swUpdate.checkForUpdate.mockClear();

    window.dispatchEvent(new Event('online'));

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('checks for updates when the document becomes visible', () => {
    visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    TestBed.inject(AppUpdateService);
    swUpdate.checkForUpdate.mockClear();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not throw or check when service worker updates are disabled', () => {
    swUpdate.isEnabled = false;

    expect(() => TestBed.inject(AppUpdateService)).not.toThrow();
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

  it('logs installation failures without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.inject(AppUpdateService);

    versionUpdates.next({
      type: 'VERSION_INSTALLATION_FAILED',
      version: { hash: 'failed' },
      error: 'boom',
    });

    expect(warn).toHaveBeenCalledWith('[SW] Version installation failed', 'boom');
  });
});
