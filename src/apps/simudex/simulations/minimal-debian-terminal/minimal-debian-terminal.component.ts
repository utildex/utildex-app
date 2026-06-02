import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { TerminalPlatformComponent } from '../../../../components/terminal-platform/terminal-platform.component';
import {
  DebianSessionBackendAdapter,
  MINIMAL_DEBIAN_RUNTIME_MANIFEST,
} from '../../../../core/sandbox';
import { SandboxTerminalSessionService } from '../../../../services/sandbox-terminal-session.service';

@Component({
  selector: 'app-minimal-debian-terminal',
  standalone: true,
  imports: [CommonModule, TerminalPlatformComponent],
  template: `
    <section class="flex w-full flex-col gap-4">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-semibold tracking-wide text-teal-700 uppercase dark:text-teal-300">
            Simudex Sandbox
          </p>
          <h1 class="text-3xl font-bold text-slate-950 dark:text-white">Minimal Debian Terminal</h1>
        </div>

        <div class="flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span class="rounded-md border border-slate-300 px-2.5 py-1 dark:border-slate-700">
            {{ manifest.distro }} {{ manifest.architecture }}
          </span>
          <span class="rounded-md border border-slate-300 px-2.5 py-1 dark:border-slate-700">
            offline
          </span>
          <span class="rounded-md border border-slate-300 px-2.5 py-1 dark:border-slate-700">
            runtime {{ manifest.version }}
          </span>
        </div>
      </header>

      @if (bootError()) {
        <div class="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {{ bootError() }}
        </div>
      } @else if (ready()) {
        <app-terminal-platform />
      } @else {
        <div
          class="flex min-h-[28rem] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
        >
          Preparing local runtime...
        </div>
      }
    </section>
  `,
})
export class MinimalDebianTerminalComponent implements OnInit, OnDestroy {
  private readonly terminal = inject(SandboxTerminalSessionService);

  readonly isWidget = input(false);
  readonly widgetConfig = input<Record<string, unknown> | null>(null);
  readonly manifest = MINIMAL_DEBIAN_RUNTIME_MANIFEST;
  readonly ready = signal(false);
  readonly bootError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      await this.terminal.setBackend(new DebianSessionBackendAdapter(this.manifest));
      this.ready.set(true);
    } catch (error) {
      this.bootError.set(error instanceof Error ? error.message : 'Unable to prepare runtime.');
    }
  }

  ngOnDestroy(): void {
    void this.terminal.disposeAll();
  }
}
