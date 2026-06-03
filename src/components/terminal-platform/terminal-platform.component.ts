import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SandboxTerminalSessionService } from '../../services/modules/sandbox-terminal-session.service';

@Component({
  selector: 'app-terminal-platform',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section
      class="flex min-h-[28rem] w-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-slate-100 shadow-xl"
      aria-label="Terminal platform"
    >
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
          @if (terminal.activeOutput().length === 0) {
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
  command = signal('');
  terminalError = signal<string | null>(null);
  private readonly historyByTab = new Map<string, string[]>();
  private readonly historyCursorByTab = new Map<string, number>();

  statusLabel = computed(() => this.terminal.activeSession()?.status ?? 'idle');

  async ngOnInit(): Promise<void> {
    if (this.terminal.tabs().length === 0) {
      await this.createTab();
    }
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
