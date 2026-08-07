import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SandboxTerminalSessionService } from '../../services/modules/sandbox-terminal-session.service';
import { ConsentService } from '../../services/platform/consent.service';
import { ArtifactCacheService } from '../../services/sandbox/artifact-cache.service';
import { ArtifactLifecycleService } from '../../services/sandbox/artifact-lifecycle.service';
import { DEBIAN_ROOTFS_ARTIFACT } from '../../core/debian-artifact';
import { TerminalControlPanelComponent } from './terminal-control-panel.component';

@Component({
  selector: 'app-terminal-platform',
  standalone: true,
  imports: [CommonModule, FormsModule, TerminalControlPanelComponent],
  template: `
    <section
      class="flex min-h-[28rem] w-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-slate-100 shadow-xl"
      aria-label="Terminal platform"
    >
      <!-- Control Panel (always visible at top) -->
      <app-terminal-control-panel />

      <header class="flex min-h-11 items-center gap-2 border-b border-slate-800 bg-slate-900 px-2">
        <div class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          @for (tab of terminal.tabs(); track tab.id) {
            <button
              type="button"
              (click)="terminal.setActiveTab(tab.id)"
              class="group flex h-8 max-w-48 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors"
              [class.bg-slate-800]="tab.active"
              [class.text-white]="tab.active"
              [class.text-slate-400]="!tab.active"
              [attr.aria-pressed]="tab.active"
            >
              <span class="material-symbols-outlined text-sm">terminal</span>
              <span class="truncate">{{ tab.title }}</span>
              <span
                class="material-symbols-outlined rounded text-sm opacity-60 hover:bg-slate-700 hover:opacity-100"
                (click)="closeTab(tab.id, $event)"
                aria-hidden="true"
                >close</span
              >
            </button>
          }
        </div>

        <button
          type="button"
          (click)="createTab()"
          class="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          title="New terminal tab"
        >
          <span class="material-symbols-outlined text-base">add</span>
        </button>
      </header>

      <main class="flex min-h-0 flex-1 flex-col">
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-6">
          @if (terminalRefused()) {
            <div class="flex flex-col items-center gap-3 py-8 text-center">
              <span class="material-symbols-outlined text-3xl text-slate-500">download_off</span>
              <p class="text-slate-400">
                Download was skipped. The Debian terminal cannot start without its system
                files.
              </p>
              <button
                type="button"
                (click)="startDownload()"
                class="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
              >
                Download system files
              </button>
            </div>
          } @else if (checkingPresence()) {
            <p class="text-slate-500">Checking local data…</p>
          } @else if (terminal.tabs().length === 0) {
            <div class="flex flex-col items-center gap-4 py-8 text-center">
              <span class="material-symbols-outlined text-4xl text-slate-600">terminal</span>
              <div>
                <p class="text-slate-300 font-medium">Debian system files not yet downloaded</p>
                <p class="text-slate-500 text-xs mt-1">~629 MB · one-time download</p>
              </div>
              <button
                type="button"
                (click)="startDownload()"
                [disabled]="downloading()"
                class="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
              >
                <span class="material-symbols-outlined text-lg">download</span>
                @if (downloading()) { Downloading… } @else { Download system files }
              </button>
              <p class="text-xs text-slate-600 max-w-xs">
                Once downloaded, the terminal works fully offline. Your changes are saved locally and
                never leave this device.
              </p>
            </div>
          } @else if (terminal.activeOutput().length === 0) {
            <p class="text-slate-500">Starting terminal session...</p>
          } @else {
            @for (line of terminal.activeOutput(); track line.id) {
              <div
                class="break-words whitespace-pre-wrap"
                [class.text-slate-300]="line.stream === 'stdout'"
                [class.text-red-300]="line.stream === 'stderr'"
                [class.text-sky-300]="line.stream === 'system'"
              >
                {{ line.text }}
              </div>
            }
          }

          @if (terminalError()) {
            <div class="mt-2 break-words whitespace-pre-wrap text-red-300">
              {{ terminalError() }}
            </div>
          }
        </div>

        <form
          class="flex items-center gap-2 border-t border-slate-800 bg-slate-900 px-4 py-3 font-mono text-sm"
          (ngSubmit)="submitCommand()"
        >
          <span class="text-emerald-300">$</span>
          <input
            name="terminalCommand"
            autocomplete="off"
            spellcheck="false"
            [ngModel]="command()"
            (ngModelChange)="command.set($event || '')"
            (keydown)="onCommandKeydown($event)"
            [disabled]="!terminal.activeSession()"
            class="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
            placeholder="Type help and press Enter"
          />
          <span class="text-xs text-slate-500">{{ statusLabel() }}</span>
        </form>
      </main>
    </section>
  `,
})
export class TerminalPlatformComponent implements OnInit {
  terminal = inject(SandboxTerminalSessionService);
  private readonly consent = inject(ConsentService);
  private readonly cache = inject(ArtifactCacheService);
  private readonly lifecycle = inject(ArtifactLifecycleService);
  command = signal('');
  terminalError = signal<string | null>(null);
  terminalRefused = signal(false);
  downloading = signal(false);
  checkingPresence = signal(true);
  private readonly historyByTab = new Map<string, string[]>();
  private readonly historyCursorByTab = new Map<string, number>();

  statusLabel = computed(() => this.terminal.activeSession()?.status ?? 'idle');

  async ngOnInit(): Promise<void> {
    this.checkingPresence.set(true);
    await this.checkArtifactPresence();
    this.checkingPresence.set(false);
  }

  async createTab(): Promise<void> {
    try {
      this.terminalError.set(null);
      await this.terminal.createTab();
    } catch (error) {
      this.terminalError.set(
        error instanceof Error ? error.message : 'Unable to create a terminal session.',
      );
    }
  }

  /**
   * Trigger the artifact download flow (consent + cache).
   * Called when the user clicks "Download Now" in the placeholder.
   */
  async startDownload(): Promise<void> {
    const artifact = DEBIAN_ROOTFS_ARTIFACT;

    // Already cached — just boot.
    if (await this.cache.isCached(artifact.id)) {
      this.terminalRefused.set(false);
      await this.terminal.createTab();
      return;
    }

    // Try to acquire the lock. Fail gracefully if another tab is downloading.
    if (!this.lifecycle.tryAcquireLock(artifact.id, artifact)) {
      this.terminalError.set(
        'Download already in progress in another tab. Please switch to that tab.',
      );
      return;
    }

    this.downloading.set(true);

    try {
      // Check quota before starting.
      if (!(await this.cache.checkQuota(650_000_000))) {
        this.lifecycle.releaseLock(artifact.id, 'absent');
        this.terminalError.set(
          'Not enough storage space. Please free up space and try again.',
        );
        return;
      }

      const result = await this.consent.ask({
        scope: artifact.id,
        title: 'Download Required',
        description:
          'The Debian terminal needs its operating system files to run. ' +
          'This is a one-time download.',
        sizeLabel: '~629 MB',
        storageLabel: 'stored securely in your browser',
        icon: 'terminal',
        downloadAction: (onProgress) =>
          this.cache.download(artifact, onProgress, {
            heartbeat: (id) => this.lifecycle.heartbeat(id),
          }),
        refuseMessage:
          'Without these files, the Debian terminal cannot start. ' +
          'You can try again by clicking Download.',
        preDownloadNote:
          'Once downloaded, the terminal works fully offline. ' +
          'Your changes are saved locally and never leave this device.',
      });

      if (result.consented) {
        this.lifecycle.releaseLock(artifact.id, 'ready', {
          stats: { totalBytes: 629_145_600, downloadedBytes: 629_145_600 },
          progress: 100,
        });
        this.terminalRefused.set(false);
        await this.terminal.createTab();
      } else {
        this.lifecycle.releaseLock(artifact.id, 'absent');
        this.terminalRefused.set(true);
      }
    } catch (error) {
      this.lifecycle.releaseLock(artifact.id, 'failed', {
        error: error instanceof Error ? error.message : 'Download failed.',
      });
      this.terminalError.set(
        error instanceof Error ? error.message : 'Download failed.',
      );
    } finally {
      this.downloading.set(false);
    }
  }

  /** Whether the artifact is cached. */
  async checkArtifactPresence(): Promise<void> {
    try {
      const cached = await this.cache.isCached(DEBIAN_ROOTFS_ARTIFACT.id);
      if (cached) {
        // Already cached — boot the terminal immediately.
        this.terminalRefused.set(false);
        if (this.terminal.tabs().length === 0) {
          await this.terminal.createTab();
        }
      }
    } catch {
      // Silently ignore — user may be offline.
    }
  }

  async closeTab(tabId: string, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      this.terminalError.set(null);
      await this.terminal.closeTab(tabId);
    } catch (error) {
      this.terminalError.set(error instanceof Error ? error.message : 'Unable to close terminal.');
    }
  }

  async submitCommand(): Promise<void> {
    const value = this.command().trim();
    if (!value) return;

    this.pushCommandHistory(value);
    this.command.set('');
    try {
      this.terminalError.set(null);
      await this.terminal.writeToActiveTab(value);
    } catch (error) {
      this.terminalError.set(error instanceof Error ? error.message : 'Terminal command failed.');
    }
  }

  onCommandKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }

    const tabId = this.terminal.activeTabId();
    if (!tabId) {
      return;
    }

    const history = this.historyByTab.get(tabId) ?? [];
    if (history.length === 0) {
      return;
    }

    const fallbackCursor = history.length;
    let cursor = this.historyCursorByTab.get(tabId) ?? fallbackCursor;

    if (event.key === 'ArrowUp') {
      if (cursor <= 0) {
        return;
      }

      cursor -= 1;
      this.historyCursorByTab.set(tabId, cursor);
      this.command.set(history[cursor] ?? '');
      event.preventDefault();
      return;
    }

    if (cursor >= history.length - 1) {
      this.historyCursorByTab.set(tabId, fallbackCursor);
      this.command.set('');
      event.preventDefault();
      return;
    }

    cursor += 1;
    this.historyCursorByTab.set(tabId, cursor);
    this.command.set(history[cursor] ?? '');
    event.preventDefault();
  }

  private pushCommandHistory(command: string): void {
    const tabId = this.terminal.activeTabId();
    if (!tabId) {
      return;
    }

    const history = this.historyByTab.get(tabId) ?? [];
    if (history.at(-1) !== command) {
      history.push(command);
      if (history.length > 200) {
        history.shift();
      }
      this.historyByTab.set(tabId, history);
    }
    this.historyCursorByTab.set(tabId, history.length);
  }
}
