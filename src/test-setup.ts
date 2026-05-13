import '@analogjs/vitest-angular/setup-zone';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import 'fake-indexeddb/auto';
import { afterEach, vi } from 'vitest';

setupTestBed({ zoneless: false });

const mediaQueryList = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(mediaQueryList),
});

class TestResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
}

globalThis.ResizeObserver = TestResizeObserver;
globalThis.IntersectionObserver = TestIntersectionObserver;

Object.defineProperty(window, 'requestIdleCallback', {
  writable: true,
  value: vi.fn((callback: IdleRequestCallback): number => {
    const start = Date.now();
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  }),
});

Object.defineProperty(window, 'cancelIdleCallback', {
  writable: true,
  value: vi.fn((handle: number): void => window.clearTimeout(handle)),
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
