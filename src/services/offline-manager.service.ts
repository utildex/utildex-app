import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { TOOL_REGISTRY_MAP } from '../core/tool-registry';
import { PersistenceService } from './persistence.service';
import { DbService } from './db.service';
import { GuideService } from './guide.service';

const OFFLINE_ROUTE_LOADERS: Array<() => Promise<unknown>> = [
  () => import('../pages/user-dashboard/user-dashboard.component'),
  () => import('../pages/categories/categories.component'),
  () => import('../pages/category-detail/category-detail.component'),
  () => import('../pages/history/history.component'),
  () => import('../pages/legal/legal.component'),
  () => import('../pages/privacy/privacy.component'),
  () => import('../pages/terms/terms.component'),
  () => import('../pages/all-tools/all-tools.component'),
  () => import('../pages/tool-host/tool-host.component'),
];

@Injectable({
  providedIn: 'root',
})
export class OfflineManagerService {
  private persistence = inject(PersistenceService);
  private db = inject(DbService);
  private guide = inject(GuideService);

  // State
  isDownloading = signal(false);
  isStopping = signal(false);
  downloadedCount = signal(0);

  // Track downloaded tools persistence
  private downloadCacheKey = 'offline-tools-cache';
  downloadedTools = signal<Set<string>>(new Set());

  // Settings
  smartDownloadEnabled = signal(false);

  // Derived
  totalTools = computed(() => Object.keys(TOOL_REGISTRY_MAP).length);
  progress = computed(() => {
    const total = this.totalTools();
    if (total === 0) {
      return 0;
    }
    const downloaded = this.downloadedTools().size;
    return Math.round((downloaded / total) * 100);
  });

  private abortController: AbortController | null = null;
  private queue: string[] = [];
  private swActivationReloadKey = 'offline-sw-activation-reload';

  constructor() {
    this.persistence.storage(this.smartDownloadEnabled, 'smart-download', 'boolean');
    this.loadCache();

    effect(() => {
      if (this.smartDownloadEnabled()) {
        this.initSmartLoader();
      }
    });

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      navigator.serviceWorker.controller
    ) {
      sessionStorage.removeItem(this.swActivationReloadKey);
    }
  }

  private async loadCache() {
    const saved = await this.db.get<string[]>(this.downloadCacheKey);
    if (saved && Array.isArray(saved)) {
      this.downloadedTools.set(new Set(saved));
    }
  }

  async downloadLibrary() {
    if (this.isDownloading()) return;

    // Check what is missing
    const allTools = Object.keys(TOOL_REGISTRY_MAP);
    const existing = this.downloadedTools();
    const missing = allTools.filter((id) => !existing.has(id));

    if (missing.length === 0) {
      this.guide.notify('NOTIFY_LIB_DOWNLOADED', 4000);
      return;
    }

    this.isDownloading.set(true);
    this.isStopping.set(false);
    this.downloadedCount.set(0);
    this.abortController = new AbortController();

    this.queue = missing;

    try {
      await this.preloadRoutes();
      const failedCount = await this.processQueue();
      if (!this.isStopping()) {
        if (failedCount === 0) {
          this.guide.notify('NOTIFY_LIB_DOWNLOADED', 6000);
        } else {
          this.guide.notify('NOTIFY_LIB_PARTIAL', 7000);
        }

        if (this.scheduleServiceWorkerActivationReload()) {
          this.guide.notify('NOTIFY_SW_NOT_READY', 7000);
        }
      }
    } catch {
      // Stopped
    } finally {
      this.isDownloading.set(false);
      this.isStopping.set(false);
    }
  }

  cancelDownload() {
    if (this.isDownloading()) {
      this.isStopping.set(true);
      if (this.abortController) {
        this.abortController.abort();
      }
    }
  }

  private async processQueue(): Promise<number> {
    let failedCount = 0;

    for (const toolId of this.queue) {
      if (this.isStopping() || this.abortController?.signal.aborted) {
        throw new Error('Download cancelled');
      }

      const entry = TOOL_REGISTRY_MAP[toolId];
      if (entry) {
        try {
          const [componentResult, contractResult, kernelResult] = await Promise.allSettled([
            entry.component(),
            entry.contract(),
            entry.kernel(),
          ]);

          const hasFailure =
            componentResult.status === 'rejected' ||
            contractResult.status === 'rejected' ||
            kernelResult.status === 'rejected';

          if (hasFailure) {
            failedCount += 1;
            console.warn(`Failed to fully cache tool: ${toolId}`);
          } else {
            this.markAsDownloaded(toolId);
          }
        } catch (err) {
          failedCount += 1;
          console.warn(`Failed to cache tool: ${toolId}`, err);
        }
      } else {
        failedCount += 1;
        console.warn(`Missing registry entry for tool: ${toolId}`);
      }

      this.downloadedCount.update((c) => c + 1);

      // Throttle
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return failedCount;
  }

  private markAsDownloaded(id: string) {
    this.downloadedTools.update((set) => {
      const newSet = new Set(set);
      newSet.add(id);
      return newSet;
    });
    // Persist (fire and forget)
    this.db.set(this.downloadCacheKey, Array.from(this.downloadedTools()));
  }

  private initSmartLoader() {
    const idx = window.requestIdleCallback;
    if (idx) {
      // Small initial delay to let app startup finish
      idx(() => setTimeout(() => this.backgroundLoadStep(), 2000));
    } else {
      setTimeout(() => this.backgroundLoadStep(), 5000);
    }
  }

  private async backgroundLoadStep() {
    if (!this.smartDownloadEnabled()) return;

    const allTools = Object.keys(TOOL_REGISTRY_MAP);
    const existing = this.downloadedTools();
    const missing = allTools.find((id) => !existing.has(id));

    if (missing) {
      try {
        const entry = TOOL_REGISTRY_MAP[missing];
        if (entry) {
          await Promise.allSettled([entry.component(), entry.contract(), entry.kernel()]);
          this.markAsDownloaded(missing);
        }
      } catch (e) {
        console.error(e);
      }

      const idx = window.requestIdleCallback;
      if (idx) idx(() => this.backgroundLoadStep());
      else setTimeout(() => this.backgroundLoadStep(), 2000);
    }
  }

  private scheduleServiceWorkerActivationReload(): boolean {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    if (navigator.serviceWorker.controller) {
      sessionStorage.removeItem(this.swActivationReloadKey);
      return false;
    }

    if (!navigator.onLine) {
      return false;
    }

    if (sessionStorage.getItem(this.swActivationReloadKey) === '1') {
      return false;
    }

    sessionStorage.setItem(this.swActivationReloadKey, '1');
    setTimeout(() => window.location.reload(), 1200);
    return true;
  }

  private async preloadRoutes() {
    await Promise.allSettled(
      OFFLINE_ROUTE_LOADERS.map(async (loadRouteChunk) => {
        try {
          await loadRouteChunk();
        } catch (e) {
          console.warn('Failed to preload route chunk', e);
        }
      }),
    );
  }
}
