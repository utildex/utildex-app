import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArtifactCacheService } from '../../services/sandbox/artifact-cache.service';
import { DEBIAN_ROOTFS_ARTIFACT } from '../../core/debian-artifact';
import type { ArtifactCacheStats } from '../../core/sandbox-artifact';

/** Toggle button label when collapsed. */
type PanelLabel = '⏻ Control';

@Component({
  selector: 'app-terminal-control-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border-t border-slate-800 bg-slate-900">
      <!-- Toggle bar -->
      <button
        type="button"
        (click)="expanded.set(!expanded())"
        class="flex w-full items-center gap-2 px-4 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
        [attr.aria-expanded]="expanded()"
      >
        <span
          class="material-symbols-outlined text-sm transition-transform"
          [class.rotate-180]="expanded()"
        >
          keyboard_arrow_up
        </span>
        <span>Control Panel</span>

        <!-- Compact status when collapsed -->
        @if (!expanded()) {
          <span class="ml-auto flex items-center gap-1.5">
            <span
              class="inline-block h-1.5 w-1.5 rounded-full"
              [class.bg-green-400]="isOnline() && isCached()"
              [class.bg-amber-400]="!isOnline() && isCached()"
              [class.bg-red-400]="!isCached()"
            ></span>
            <span class="text-slate-500">{{
              isCached() ? 'Cached' : 'Download required'
            }}</span>
          </span>
        }
      </button>

      <!-- Expanded panel -->
      @if (expanded()) {
        <div class="animate-fade-in space-y-3 px-4 pb-4">
          <!-- Status -->
          <div class="flex items-center gap-2 text-xs">
            <span
              class="inline-block h-2 w-2 rounded-full"
              [class.bg-green-400]="isOnline() && isCached()"
              [class.bg-amber-400]="!isOnline() && isCached()"
              [class.bg-red-400]="!isCached() && isOnline()"
              [class.bg-slate-600]="!isCached() && !isOnline()"
            ></span>
            <span class="font-medium text-slate-300">{{
              statusLabel()
            }}</span>
          </div>

          <!-- Debian Terminal section -->
          @if (stats(); as s) {
            <div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Debian Terminal
              </h4>

              <!-- Rootfs -->
              <div class="flex items-center justify-between text-xs">
                <span class="flex items-center gap-1.5 text-slate-400">
                  <span class="material-symbols-outlined text-sm">cloud_download</span>
                  Rootfs
                </span>
                <span class="text-slate-300">
                  {{ formatBytes(s.totalBytes) }}
                  @if (s.complete) {
                    <span class="ml-1 text-green-400">Cached ✓</span>
                  } @else if (s.downloading) {
                    <span class="ml-1 text-amber-400">{{ s.downloadedBytes / s.totalBytes * 100 | number:'1.0-0' }}%</span>
                  } @else {
                    <span class="ml-1 text-red-400">Not cached</span>
                  }
                </span>
              </div>

              <!-- Overlay usage -->
              @if (overlayBytes() !== null) {
                <div class="flex items-center justify-between text-xs">
                  <span class="flex items-center gap-1.5 text-slate-400">
                    <span class="material-symbols-outlined text-sm">save</span>
                    Your changes
                  </span>
                  <span class="text-slate-300">{{ formatBytes(overlayBytes()!) }}</span>
                </div>
              }

              <!-- Runtime info -->
              @if (s.version) {
                <div class="flex items-center justify-between text-xs">
                  <span class="flex items-center gap-1.5 text-slate-400">
                    <span class="material-symbols-outlined text-sm">info</span>
                    Version
                  </span>
                  <span class="text-slate-500">{{ s.version }}</span>
                </div>
              }
            </div>
          }

          <!-- Storage section -->
          <div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Storage</h4>

            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Total cached</span>
              <span class="text-slate-300">{{ formatBytes(totalUsage()) }}</span>
            </div>

            @if (quotaPercent() !== null) {
              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Browser quota</span>
                  <span class="text-slate-500">
                    {{ formatBytes(quotaUsage()) }} / {{ formatBytes(quotaLimit()) }}
                  </span>
                </div>
                <div class="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    class="h-full rounded-full transition-all"
                    [class.bg-green-500]="quotaPercent()! < 50"
                    [class.bg-amber-500]="quotaPercent()! >= 50 && quotaPercent()! < 80"
                    [class.bg-red-500]="quotaPercent()! >= 80"
                    [style.width.%]="quotaPercent()"
                  ></div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class TerminalControlPanelComponent {
  private readonly cache = inject(ArtifactCacheService);

  /** Whether the panel is expanded. */
  protected readonly expanded = signal(false);

  /** Online status. */
  protected readonly isOnline = signal(navigator.onLine);

  /** Cache stats for the Debian artifact. */
  protected readonly stats = signal<ArtifactCacheStats | null>(null);

  /** Total bytes across all cached artifacts. */
  protected readonly totalUsage = signal(0);

  /** Overlay IndexedDB usage in bytes (estimated). */
  protected readonly overlayBytes = signal<number | null>(null);

  /** Storage quota usage / limit / percent. */
  protected readonly quotaUsage = signal(0);
  protected readonly quotaLimit = signal(0);
  protected readonly quotaPercent = signal<number | null>(null);

  constructor() {
    // Listen for online/offline changes.
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));

    // Refresh stats when expanded.
    effect(() => {
      if (this.expanded()) {
        void this.refresh();
      }
    });
  }

  // ─── Public ────────────────────────────────────────────────────────────

  /** Whether the Debian artifact is cached. */
  isCached(): boolean {
    return this.stats()?.complete === true;
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private async refresh(): Promise<void> {
    try {
      const s = await this.cache.getStats(DEBIAN_ROOTFS_ARTIFACT.id);
      this.stats.set(s);

      const usage = await this.cache.getTotalUsage();
      this.totalUsage.set(usage);
    } catch {
      // Silently ignore — user may be offline or DB not available.
    }

    try {
      this.overlayBytes.set(await this.estimateOverlayUsage());
    } catch {
      this.overlayBytes.set(null);
    }

    try {
      const est = await navigator.storage?.estimate();
      if (est?.quota && est?.usage) {
        this.quotaUsage.set(est.usage);
        this.quotaLimit.set(est.quota);
        this.quotaPercent.set(Math.round((est.usage / est.quota) * 100));
      }
    } catch {
      this.quotaPercent.set(null);
    }
  }

  protected statusLabel(): string {
    if (!this.isOnline() && this.isCached()) return 'Offline — cached data in use';
    if (this.isOnline() && this.isCached()) return 'Online — cached ✓';
    if (this.isOnline() && !this.isCached()) return 'Online — download required';
    return 'Offline — download unavailable';
  }

  private async estimateOverlayUsage(): Promise<number> {
    try {
      const dbs = await indexedDB.databases();
      let total = 0;
      for (const db of dbs) {
        if (db.name?.includes('simudex-') && db.name?.includes('overlay')) {
          // Rough estimate: open the DB and sum key sizes.
          // This is a best-effort approximation.
          total += await this.estimateDbSize(db.name!);
        }
      }
      return total;
    } catch {
      return 0;
    }
  }

  private estimateDbSize(dbName: string): Promise<number> {
    return new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => {
        const db = req.result;
        let size = 0;
        const storeNames = Array.from(db.objectStoreNames);
        let pending = storeNames.length;
        if (pending === 0) {
          db.close();
          resolve(0);
          return;
        }
        for (const name of storeNames) {
          const tx = db.transaction(name, 'readonly');
          const store = tx.objectStore(name);
          const countReq = store.count();
          countReq.onsuccess = () => {
            size += countReq.result * 1024; // Rough estimate: 1 KB per entry.
            pending -= 1;
            if (pending === 0) {
              db.close();
              resolve(size);
            }
          };
          countReq.onerror = () => {
            pending -= 1;
            if (pending === 0) {
              db.close();
              resolve(size);
            }
          };
        }
      };
      req.onerror = () => resolve(0);
    });
  }

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
}
