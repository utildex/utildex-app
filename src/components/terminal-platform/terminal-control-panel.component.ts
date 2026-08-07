import { Component, inject, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArtifactLifecycleService } from '../../services/sandbox/artifact-lifecycle.service';
import { DEBIAN_ROOTFS_ARTIFACT } from '../../core/debian-artifact';

@Component({
  selector: 'app-terminal-control-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="flex items-center gap-3 overflow-x-auto border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs"
    >
      <!-- Debian artifact status -->
      <div
        class="flex items-center gap-1.5 shrink-0"
        [title]="debianTooltip()"
      >
        <span class="material-symbols-outlined text-base">terminal</span>
        <span class="font-medium text-slate-300">Debian</span>
        @if (debianStats(); as s) {
          @if (s.phase === 'ready') {
            <span class="text-green-400 font-medium">{{ formatBytes(s.stats?.totalBytes ?? 0) }} ✓</span>
          } @else if (s.phase === 'acquiring') {
            <span class="text-amber-400">{{ s.progress }}%</span>
          } @else if (s.phase === 'verifying') {
            <span class="text-amber-400">Verifying… {{ s.progress }}%</span>
          } @else if (s.phase === 'failed') {
            <span class="text-red-400" [title]="s.error">Failed</span>
          } @else {
            <span class="text-red-400">Not cached</span>
          }
        } @else {
          <span class="text-slate-600">—</span>
        }
      </div>

      <span class="text-slate-700 select-none">│</span>

      <!-- Network -->
      <div class="flex items-center gap-1.5 shrink-0" title="Network status">
        <span
          class="inline-block h-2 w-2 rounded-full"
          [class.bg-green-400]="isOnline()"
          [class.bg-amber-400]="!isOnline()"
        ></span>
        <span class="text-slate-300">{{ isOnline() ? 'Online' : 'Offline' }}</span>
      </div>

      <!-- Runtime version -->
      @if (debianStats()?.stats?.version; as v) {
        <span class="text-slate-700 select-none">│</span>
        <div class="flex items-center gap-1.5 shrink-0" title="Debian runtime version">
          <span class="material-symbols-outlined text-base">info</span>
          <span class="text-slate-500">{{ v }}</span>
        </div>
      }
    </div>
  `,
})
export class TerminalControlPanelComponent implements OnDestroy {
  private readonly lifecycle = inject(ArtifactLifecycleService);

  protected readonly isOnline = signal(navigator.onLine);
  protected readonly debianStats = computed(() =>
    this.lifecycle.all().find((s) => s.artifactId === DEBIAN_ROOTFS_ARTIFACT.id) ?? null,
  );

  private readonly onOnline = () => this.isOnline.set(true);
  private readonly onOffline = () => this.isOnline.set(false);

  constructor() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }

  protected debianTooltip(): string {
    const s = this.debianStats();
    if (!s) return 'Debian artifact status';
    if (s.phase === 'ready') return `Debian rootfs cached (${this.formatBytes(s.stats?.totalBytes ?? 0)}). Version ${s.stats?.version ?? 'unknown'}.`;
    if (s.phase === 'acquiring') return `Downloading… ${s.progress}%`;
    return 'Debian rootfs not yet downloaded.';
  }

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
    return `${(bytes / 1000 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
}
