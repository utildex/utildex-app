import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ClipboardService } from '../../services/clipboard.service';
import { DbService } from '../../services/db.service';
import { ToolState } from '../../services/tool-state';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { BubbleDirective } from '../../directives/bubble.directive';
import { type UrlMode, transformUrl } from './url-encoder-decoder.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-url-encoder-decoder',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, BubbleDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="url-encoder-decoder">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <div class="glass-surface relative flex h-full flex-col overflow-hidden rounded-xl">
        <div class="glass-subsection flex items-center justify-between border-b px-2 py-1.5">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-primary text-base">link</span>
            <span class="text-[10px] font-bold tracking-wide text-slate-500 uppercase">{{
              t.map()['WIDGET_TITLE']
            }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <label
              class="glass-control inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300"
              [title]="t.map()['TOGGLE_PLUS_FOR_SPACE']"
            >
              <span class="hidden sm:inline">+</span>
              <input
                type="checkbox"
                [ngModel]="plusForSpace()"
                (ngModelChange)="setPlusForSpace($event)"
                class="accent-primary h-3.5 w-3.5"
              />
            </label>

            <div class="glass-control inline-flex rounded-full p-0.5">
              <button
                (click)="setMode('encode')"
                class="rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors"
                [class]="
                  mode() === 'encode'
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                "
              >
                {{ t.map()['MODE_ENCODE'] }}
              </button>
              <button
                (click)="setMode('decode')"
                class="rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors"
                [class]="
                  mode() === 'decode'
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                "
              >
                {{ t.map()['MODE_DECODE'] }}
              </button>
            </div>
          </div>
        </div>

        @if (viewMode() === 'wide') {
          <div class="flex flex-1 flex-col gap-2 p-2">
            <div class="grid min-h-0 flex-1 grid-cols-2 gap-2">
              <div class="glass-control flex min-h-0 flex-col rounded-lg border">
                <div
                  class="border-b px-2 py-1 text-[10px] font-bold tracking-wide text-slate-500 uppercase"
                >
                  {{ t.map()['INPUT_LABEL'] }}
                </div>
                <textarea
                  [ngModel]="input()"
                  (ngModelChange)="onInputChange($event)"
                  [placeholder]="
                    mode() === 'encode'
                      ? t.map()['INPUT_PLACEHOLDER_ENCODE']
                      : t.map()['INPUT_PLACEHOLDER_DECODE']
                  "
                  rows="3"
                  class="min-h-0 flex-1 resize-none bg-transparent p-2 font-mono text-[11px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
                ></textarea>
              </div>

              <div class="glass-control flex min-h-0 flex-col rounded-lg border">
                <div
                  class="border-b px-2 py-1 text-[10px] font-bold tracking-wide text-slate-500 uppercase"
                >
                  {{ t.map()['OUTPUT_LABEL'] }}
                </div>
                <pre
                  class="min-h-0 flex-1 overflow-auto p-2 font-mono text-[11px] break-words whitespace-pre-wrap text-slate-700 dark:text-slate-100"
                  >{{ output() || t.map()['OUTPUT_PLACEHOLDER'] }}</pre
                >
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button
                (click)="clearAll()"
                class="glass-button flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {{ t.map()['BTN_CLEAR'] }}
              </button>
              <button
                (click)="swapInputOutput()"
                class="glass-button flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {{ t.map()['BTN_SWAP'] }}
              </button>
              <button
                (click)="copyOutput()"
                [disabled]="!output()"
                class="bg-primary flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {{ copied() ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
              </button>
            </div>
          </div>
        } @else {
          <div class="flex flex-1 flex-col gap-2 p-2">
            <textarea
              [ngModel]="input()"
              (ngModelChange)="onInputChange($event)"
              [placeholder]="
                mode() === 'encode'
                  ? t.map()['INPUT_PLACEHOLDER_ENCODE']
                  : t.map()['INPUT_PLACEHOLDER_DECODE']
              "
              rows="3"
              class="glass-control min-h-0 w-full resize-none rounded-lg border p-2 font-mono text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
            ></textarea>

            <div
              class="glass-control flex-1 overflow-auto rounded-lg border p-2 font-mono text-xs text-slate-700 dark:text-slate-100"
            >
              {{ output() || t.map()['OUTPUT_PLACEHOLDER'] }}
            </div>

            <div class="flex items-center gap-1">
              <button
                (click)="swapInputOutput()"
                class="glass-button flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {{ t.map()['BTN_SWAP'] }}
              </button>
              <button
                (click)="copyOutput()"
                [disabled]="!output()"
                class="bg-primary flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {{ copied() ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
              </button>
            </div>
          </div>
        }
      </div>
    }

    <ng-template #mainContent>
      <div class="glass-surface glass-surface-hover relative overflow-hidden rounded-2xl">
        <div
          class="pointer-events-none absolute -top-28 -right-20 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-yellow-300/15 blur-3xl"
        ></div>

        <div class="glass-subsection relative z-[1] border-b px-4 py-3 sm:px-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="glass-control inline-flex rounded-full border p-1">
              <button
                (click)="setMode('encode')"
                class="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                [class]="
                  mode() === 'encode'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                "
              >
                {{ t.map()['MODE_ENCODE'] }}
              </button>
              <button
                (click)="setMode('decode')"
                class="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                [class]="
                  mode() === 'decode'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                "
              >
                {{ t.map()['MODE_DECODE'] }}
              </button>
            </div>

            <label
              class="glass-control inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
            >
              <span class="text-[10px] font-bold tracking-wide text-slate-500 uppercase">{{
                t.map()['SETTING_LABEL']
              }}</span>
              <span class="h-4 w-px bg-slate-200 dark:bg-slate-700"></span>
              <input
                type="checkbox"
                [ngModel]="plusForSpace()"
                (ngModelChange)="setPlusForSpace($event)"
                class="accent-primary h-4 w-4"
              />
              {{ t.map()['TOGGLE_PLUS_FOR_SPACE'] }}
              <span
                class="material-symbols-outlined cursor-help text-base text-slate-400"
                [appBubble]="'TOGGLE_PLUS_FOR_SPACE'"
                bubblePos="top"
                >help</span
              >
            </label>
          </div>
        </div>

        <div class="relative z-[1] grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-6 lg:grid-cols-2">
          <section class="glass-surface rounded-xl">
            <div class="glass-subsection flex items-center justify-between border-b px-4 py-2.5">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-base">input</span>
                <span class="text-xs font-bold tracking-wide text-slate-500 uppercase">{{
                  t.map()['INPUT_LABEL']
                }}</span>
              </div>
              <span class="text-[11px] text-slate-500 dark:text-slate-300"
                >{{ inputLength() }} {{ t.map()['STATUS_CHARS'] }} • {{ inputBytes() }}
                {{ t.map()['STATUS_BYTES'] }}</span
              >
            </div>
            <textarea
              [ngModel]="input()"
              (ngModelChange)="onInputChange($event)"
              [placeholder]="
                mode() === 'encode'
                  ? t.map()['INPUT_PLACEHOLDER_ENCODE']
                  : t.map()['INPUT_PLACEHOLDER_DECODE']
              "
              rows="13"
              class="h-72 w-full resize-y bg-transparent p-4 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            ></textarea>
          </section>

          <section
            class="glass-surface cursor-not-allowed rounded-xl opacity-90"
            [attr.aria-label]="t.map()['OUTPUT_LABEL']"
          >
            <div class="glass-subsection flex items-center justify-between border-b px-4 py-2.5">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-base">output</span>
                <span class="text-xs font-bold tracking-wide text-slate-500 uppercase">{{
                  t.map()['OUTPUT_LABEL']
                }}</span>
                <span class="material-symbols-outlined text-xs text-slate-400">lock</span>
              </div>
              <span class="text-[11px] text-slate-500 dark:text-slate-300"
                >{{ outputLength() }} {{ t.map()['STATUS_CHARS'] }} • {{ outputBytes() }}
                {{ t.map()['STATUS_BYTES'] }}</span
              >
            </div>
            <div class="h-72 overflow-auto p-4">
              <pre
                class="cursor-not-allowed font-mono text-sm break-words whitespace-pre-wrap text-slate-800 dark:text-slate-100"
                >{{ output() || t.map()['OUTPUT_PLACEHOLDER'] }}</pre
              >
            </div>
          </section>
        </div>

        <div class="glass-subsection relative z-[1] border-t px-4 py-3 sm:px-6">
          <div class="flex items-center justify-start">
            <div
              class="glass-control inline-flex flex-wrap items-center gap-2 rounded-xl border p-1.5 sm:gap-3"
            >
              <button
                (click)="swapInputOutput()"
                class="glass-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                <span class="material-symbols-outlined text-base">swap_vert</span>
                {{ t.map()['BTN_SWAP'] }}
              </button>

              <button
                (click)="clearAll()"
                class="glass-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                <span class="material-symbols-outlined text-base">delete</span>
                {{ t.map()['BTN_CLEAR'] }}
              </button>

              <button
                (click)="copyOutput()"
                [disabled]="!output()"
                class="bg-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span class="material-symbols-outlined text-base">content_copy</span>
                {{ copied() ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
              </button>
            </div>
          </div>

          @if (error()) {
            <div
              class="mt-3 rounded-lg border border-rose-300/70 bg-rose-100/70 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/30 dark:text-rose-200"
            >
              {{ t.map()['ERROR_INVALID_URL_ENCODING'] }}
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class UrlEncoderDecoderComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  clipboard = inject(ClipboardService);
  db = inject(DbService);

  private state = new ToolState(
    'url-encoder-decoder',
    {
      mode: 'encode' as UrlMode,
      input: '',
      output: '',
      plusForSpace: false,
    },
    this.db,
  );

  mode = this.state.select('mode');
  input = this.state.select('input');
  output = this.state.select('output');
  plusForSpace = this.state.select('plusForSpace');
  copied = signal(false);
  error = signal<string | null>(null);

  viewMode = computed(() => {
    const c = this.widgetConfig();
    const cols = (c?.['cols'] as number | undefined) ?? 2;
    const rows = (c?.['rows'] as number | undefined) ?? 2;

    if (cols === 2 && rows === 1) return 'wide';
    return 'standard';
  });

  inputLength = computed(() => this.input().length);
  outputLength = computed(() => this.output().length);
  inputBytes = computed(() => this.toUtf8Bytes(this.input()).length);
  outputBytes = computed(() => this.toUtf8Bytes(this.output()).length);

  constructor() {
    this.recalculate(this.input());
  }

  setMode(mode: UrlMode): void {
    this.state.update((s) => ({ ...s, mode }));
    this.recalculate(this.input());
  }

  setPlusForSpace(plusForSpace: boolean): void {
    this.state.update((s) => ({ ...s, plusForSpace }));
    this.recalculate(this.input());
  }

  onInputChange(value: string): void {
    this.state.update((s) => ({ ...s, input: value }));
    this.recalculate(value);
  }

  clearAll(): void {
    this.state.update((s) => ({ ...s, input: '', output: '' }));
    this.error.set(null);
    this.copied.set(false);
  }

  swapInputOutput(): void {
    const nextInput = this.output();
    const nextMode: UrlMode = this.mode() === 'encode' ? 'decode' : 'encode';

    this.state.update((s) => ({
      ...s,
      input: nextInput,
      mode: nextMode,
      output: '',
    }));

    this.recalculate(nextInput);
  }

  async copyOutput(): Promise<void> {
    if (!this.output()) return;
    await this.clipboard.copy(this.output());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1200);
  }

  private recalculate(inputValue: string): void {
    const result = transformUrl(this.mode(), inputValue, { plusForSpace: this.plusForSpace() });
    this.state.update((s) => ({ ...s, output: result.value }));
    this.error.set(result.error);
  }

  private toUtf8Bytes(value: string): Uint8Array {
    return new TextEncoder().encode(value);
  }
}
