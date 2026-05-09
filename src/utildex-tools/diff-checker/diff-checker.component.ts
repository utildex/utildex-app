import {
  Component,
  inject,
  signal,
  computed,
  input,
  effect,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ToolService } from '../../services/tool.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { buildDiffRows, type DiffChange, type DiffMode, type DiffRow } from './diff-checker.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

// Diff library interface
interface DiffLib {
  diffChars: (a: string, b: string, options?: { ignoreWhitespace: boolean }) => DiffChange[];
  diffWords: (a: string, b: string, options?: { ignoreWhitespace: boolean }) => DiffChange[];
  diffLines: (a: string, b: string, options?: { ignoreWhitespace: boolean }) => DiffChange[];
}

interface WindowWithDiff extends Window {
  Diff?: DiffLib;
}

interface WidgetConfig {
  cols?: number;
  rows?: number;
  instanceId?: string;
  diffData?: {
    a?: string;
    b?: string;
  };
}

@Component({
  selector: 'app-diff-checker',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      /* GitHub-like Diff Styles */
      .diff-table {
        width: 100%;
        border-collapse: collapse;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
          monospace;
        font-size: 12px;
        line-height: 1.5;
      }

      .diff-row {
        width: 100%;
      }

      /* Line Numbers */
      .diff-num {
        width: 1%;
        min-width: 30px;
        padding-right: 5px;
        padding-left: 5px;
        text-align: right;
        color: #6e7781;
        user-select: none;
        vertical-align: top;
        border-right: 1px solid #eee;
        background-color: #f6f8fa;
      }
      .dark .diff-num {
        color: #8b949e;
        border-right-color: #30363d;
        background-color: #0d1117;
      }

      /* Content Cells */
      .diff-code {
        position: relative;
        padding-left: 10px;
        padding-right: 10px;
        vertical-align: top;
        white-space: pre-wrap;
        word-break: break-all;
      }

      /* Added Lines */
      .diff-added .diff-num {
        background-color: #ccffd8;
        border-right-color: #bef5cb;
      }
      .diff-added .diff-code {
        background-color: #e6ffec;
      }
      .dark .diff-added .diff-num {
        background-color: #1f3625;
        border-right-color: #2ea04366;
      }
      .dark .diff-added .diff-code {
        background-color: #1a3222;
      }

      /* Removed Lines */
      .diff-removed .diff-num {
        background-color: #ffd7d5;
        border-right-color: #ffdce0;
      }
      .diff-removed .diff-code {
        background-color: #ffebe9;
      }
      .dark .diff-removed .diff-num {
        background-color: #3e1f23;
        border-right-color: #f8514966;
      }
      .dark .diff-removed .diff-code {
        background-color: #35181c;
      }

      /* Markers */
      .diff-marker {
        user-select: none;
        margin-right: 4px;
        color: #6e7781;
        display: inline-block;
        width: 10px;
      }

      /* Widget Compact Overrides */
      .widget-diff .diff-table {
        font-size: 10px;
        line-height: 1.3;
      }
      .widget-diff .diff-num {
        min-width: 20px;
        padding: 0 2px;
      }
      .widget-diff .diff-code {
        padding: 0 4px;
      }
    `,
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="diff-checker">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- WIDGET MODE (Shared logic for 3x1 and 2x2) -->
      <div
        class="group widget-diff relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Widget Header & Controls -->
        <div
          class="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-900/50"
        >
          <!-- Params -->
          <div class="flex items-center gap-1">
            <select
              [(ngModel)]="mode"
              (change)="computeDiff()"
              class="text-primary cursor-pointer border-none bg-transparent p-0 text-[9px] font-bold uppercase focus:ring-0"
            >
              <option value="Lines">Line</option>
              <option value="Words">Word</option>
              <option value="Chars">Char</option>
            </select>
            <button
              (click)="toggleWhitespace()"
              [class.text-primary]="ignoreWhitespace()"
              [class.text-slate-400]="!ignoreWhitespace()"
              class="rounded p-0.5 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
              title="Ignore Whitespace"
            >
              <span class="material-symbols-outlined text-sm">space_bar</span>
            </button>
          </div>

          <!-- Tab Switcher -->
          <div class="flex rounded-lg bg-slate-200 p-0.5 dark:bg-slate-700">
            <button
              (click)="widgetTab.set('input')"
              class="rounded px-2 py-0.5 text-[9px] font-bold transition-all"
              [class.bg-white]="widgetTab() === 'input'"
              [class.text-primary]="widgetTab() === 'input'"
              [class.shadow-sm]="widgetTab() === 'input'"
              [class.text-slate-500]="widgetTab() !== 'input'"
            >
              {{ t.map()['W_TAB_INPUT'] }}
            </button>
            <button
              (click)="widgetTab.set('diff')"
              (click)="computeDiff()"
              class="rounded px-2 py-0.5 text-[9px] font-bold transition-all"
              [class.bg-white]="widgetTab() === 'diff'"
              [class.text-primary]="widgetTab() === 'diff'"
              [class.shadow-sm]="widgetTab() === 'diff'"
              [class.text-slate-500]="widgetTab() !== 'diff'"
            >
              {{ t.map()['W_TAB_DIFF'] }}
            </button>
          </div>
        </div>

        <!-- Widget Body -->
        <div class="relative flex-1 overflow-hidden">
          <!-- INPUT TAB -->
          @if (widgetTab() === 'input') {
            <div class="flex h-full" [class.flex-col]="!isWideWidget()">
              <!-- Input A -->
              <div
                class="relative flex flex-1 flex-col border-b border-slate-100 p-2 md:border-r md:border-b-0 dark:border-slate-700"
              >
                <div
                  class="mb-1 flex justify-between text-[9px] font-bold text-slate-400 uppercase"
                >
                  <span>{{ t.map()['ORIGINAL_LABEL'] }}</span>
                  <button (click)="textA.set('')" *ngIf="textA()" class="hover:text-red-500">
                    <span class="material-symbols-outlined text-[10px]">close</span>
                  </button>
                </div>
                <textarea
                  [(ngModel)]="textA"
                  (input)="autoDiff()"
                  [placeholder]="t.map()['W_PASTE_ORIG']"
                  class="w-full flex-1 resize-none border-none bg-transparent p-0 text-xs placeholder-slate-300 focus:ring-0"
                ></textarea>
              </div>

              <!-- Input B -->
              <div class="relative flex flex-1 flex-col p-2">
                <div
                  class="mb-1 flex justify-between text-[9px] font-bold text-slate-400 uppercase"
                >
                  <span>{{ t.map()['MODIFIED_LABEL'] }}</span>
                  <button (click)="textB.set('')" *ngIf="textB()" class="hover:text-red-500">
                    <span class="material-symbols-outlined text-[10px]">close</span>
                  </button>
                </div>
                <textarea
                  [(ngModel)]="textB"
                  (input)="autoDiff()"
                  [placeholder]="t.map()['W_PASTE_MOD']"
                  class="w-full flex-1 resize-none border-none bg-transparent p-0 text-xs placeholder-slate-300 focus:ring-0"
                ></textarea>
              </div>
            </div>
          }

          <!-- DIFF TAB -->
          @if (widgetTab() === 'diff') {
            <div class="h-full overflow-auto bg-white dark:bg-slate-900">
              @if (hasResult()) {
                @if (diffRows().length > 0) {
                  <table class="diff-table w-full">
                    <tbody>
                      @for (row of diffRows(); track $index) {
                        <tr
                          class="diff-row"
                          [class.diff-added]="row.type === 'added'"
                          [class.diff-removed]="row.type === 'removed'"
                        >
                          <td class="diff-num">
                            @if (row.type !== 'added') {
                              {{ row.oldLine }}
                            }
                          </td>
                          <td class="diff-num">
                            @if (row.type !== 'removed') {
                              {{ row.newLine }}
                            }
                          </td>
                          <td class="diff-code">
                            @if (row.type === 'added') {
                              <span class="diff-marker">+</span>
                            } @else if (row.type === 'removed') {
                              <span class="diff-marker">-</span>
                            }
                            {{ row.content }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>

                  @if (stats().changes === 0) {
                    <div
                      class="flex h-full flex-col items-center justify-center p-4 text-green-500"
                    >
                      <span class="material-symbols-outlined text-3xl">check_circle</span>
                      <span class="mt-1 text-xs font-bold">{{ t.map()['NO_DIFF'] }}</span>
                    </div>
                  }
                }
              } @else {
                <div class="flex h-full flex-col items-center justify-center p-4 text-slate-400">
                  <span class="material-symbols-outlined mb-1 text-2xl">difference</span>
                  <span class="text-xs">{{ t.map()['W_HINT'] }}</span>
                </div>
              }
            </div>

            <!-- Floating Stats Overlay -->
            @if (hasResult() && stats().changes > 0) {
              <div
                class="pointer-events-none absolute right-2 bottom-2 rounded bg-slate-900/80 px-2 py-1 font-mono text-[9px] text-white shadow-lg backdrop-blur"
              >
                <span class="text-green-400">+{{ stats().additions }}</span> /
                <span class="text-red-400">-{{ stats().deletions }}</span>
              </div>
            }
          }
        </div>
      </div>
    }

    <!-- MAIN APP TEMPLATE -->
    <ng-template #mainContent>
      <div class="flex flex-col gap-6">
        <!-- Inputs Area -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Left -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between px-1">
              <label class="text-xs font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['ORIGINAL_LABEL']
              }}</label>
              <button
                (click)="textA.set('')"
                class="text-[10px] text-slate-400 uppercase hover:text-red-500"
                [class.opacity-0]="!textA()"
              >
                {{ t.map()['BTN_CLEAR'] }}
              </button>
            </div>
            <div class="group relative">
              <textarea
                [(ngModel)]="textA"
                (input)="computeDiff()"
                [placeholder]="t.map()['PLACEHOLDER_ORIG']"
                class="focus:ring-primary h-40 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed focus:ring-2 focus:outline-none md:h-64 md:text-sm dark:border-slate-700 dark:bg-slate-800"
              ></textarea>
            </div>
          </div>

          <!-- Right -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between px-1">
              <label class="text-xs font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['MODIFIED_LABEL']
              }}</label>
              <button
                (click)="textB.set('')"
                class="text-[10px] text-slate-400 uppercase hover:text-red-500"
                [class.opacity-0]="!textB()"
              >
                {{ t.map()['BTN_CLEAR'] }}
              </button>
            </div>
            <div class="group relative">
              <textarea
                [(ngModel)]="textB"
                (input)="computeDiff()"
                [placeholder]="t.map()['PLACEHOLDER_MOD']"
                class="focus:ring-primary h-40 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed focus:ring-2 focus:outline-none md:h-64 md:text-sm dark:border-slate-700 dark:bg-slate-800"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Toolbar / Controls -->
        <div
          class="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-2 shadow-sm md:flex-row dark:border-slate-700 dark:bg-slate-800"
        >
          <!-- Parameters -->
          <div
            class="flex max-w-full items-center gap-2 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-700"
          >
            <button
              (click)="setMode('Lines')"
              [class]="getModeClass('Lines')"
              class="rounded-md px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all"
            >
              {{ t.map()['MODE_LINES'] }}
            </button>
            <button
              (click)="setMode('Words')"
              [class]="getModeClass('Words')"
              class="rounded-md px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all"
            >
              {{ t.map()['MODE_WORDS'] }}
            </button>
            <button
              (click)="setMode('Chars')"
              [class]="getModeClass('Chars')"
              class="rounded-md px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all"
            >
              {{ t.map()['MODE_CHARS'] }}
            </button>
          </div>

          <!-- Options -->
          <div class="flex items-center gap-4 px-2">
            <label class="group flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                [(ngModel)]="ignoreWhitespace"
                (change)="computeDiff()"
                class="text-primary focus:ring-primary rounded border-slate-300"
              />
              <span
                class="text-xs font-medium text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white"
                >{{ t.map()['OPT_WHITESPACE'] }}</span
              >
            </label>
          </div>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              (click)="swap()"
              class="hover:text-primary p-2 text-slate-500 transition-colors"
              [title]="t.map()['BTN_SWAP']"
            >
              <span class="material-symbols-outlined">swap_horiz</span>
            </button>
            <button
              (click)="clear()"
              class="p-2 text-slate-500 transition-colors hover:text-red-500"
              [title]="t.map()['BTN_CLEAR']"
            >
              <span class="material-symbols-outlined">delete_sweep</span>
            </button>
          </div>
        </div>

        <!-- Diff Result (GitHub Style) -->
        @if (hasResult()) {
          <div
            class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/50"
            >
              <div class="flex items-center gap-4 font-mono text-xs">
                <span class="font-bold text-slate-700 dark:text-slate-200"
                  >{{ stats().changes }} {{ t.map()['STATS_CHANGES'] }}</span
                >
                <span class="font-medium text-green-600"
                  >+{{ stats().additions }} {{ t.map()['STATS_ADD'] }}</span
                >
                <span class="font-medium text-red-600"
                  >-{{ stats().deletions }} {{ t.map()['STATS_DEL'] }}</span
                >
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
              <table class="diff-table">
                <tbody>
                  @for (row of diffRows(); track $index) {
                    <tr
                      class="diff-row"
                      [class.diff-added]="row.type === 'added'"
                      [class.diff-removed]="row.type === 'removed'"
                    >
                      <!-- Old Line Num -->
                      <td class="diff-num">
                        @if (row.type !== 'added') {
                          {{ row.oldLine }}
                        }
                      </td>

                      <!-- New Line Num -->
                      <td class="diff-num">
                        @if (row.type !== 'removed') {
                          {{ row.newLine }}
                        }
                      </td>

                      <!-- Content -->
                      <td class="diff-code">
                        @if (row.type === 'added') {
                          <span class="diff-marker">+</span>
                        } @else if (row.type === 'removed') {
                          <span class="diff-marker">-</span>
                        }
                        {{ row.content }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>

              @if (diffRows().length === 0) {
                <div class="p-8 text-center text-slate-500">
                  <span class="material-symbols-outlined mb-2 text-4xl text-green-500"
                    >check_circle</span
                  >
                  <p class="font-medium">{{ t.map()['NO_DIFF'] }}</p>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class DiffCheckerComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<WidgetConfig | null>(null);

  t = inject(ScopedTranslationService);
  toolService = inject(ToolService);

  // State
  textA = signal('');
  textB = signal('');

  // Widget Tab State
  widgetTab = signal<'input' | 'diff'>('input');

  // Options
  mode = signal<DiffMode>('Lines');
  ignoreWhitespace = signal(false);

  // Render State
  diffRows = signal<DiffRow[]>([]);
  stats = signal({ additions: 0, deletions: 0, changes: 0 });

  // Derived state
  hasResult = computed(() => this.textA().length > 0 || this.textB().length > 0);

  isWideWidget = computed(() => {
    if (!this.isWidget()) return false;
    const cfg = this.widgetConfig();
    return !!(cfg && cfg.cols && cfg.cols >= 3); // 3x1 is "wide" enough for side-by-side
  });

  constructor() {
    this.loadLib();

    effect(() => {
      if (this.isWidget()) {
        const cfg = this.widgetConfig();
        if (cfg?.diffData) {
          this.textA.set(cfg.diffData.a || '');
          this.textB.set(cfg.diffData.b || '');
          // Auto-compute if data exists
          if (this.textA() || this.textB()) {
            this.computeDiff();
          }
        }
      }
    });
  }

  isSize(w: number, h: number): boolean {
    const cfg = this.widgetConfig();
    if (!cfg) return w === 1 && h === 1;
    return cfg.cols === w && cfg.rows === h;
  }

  async loadLib() {
    const win = window as unknown as WindowWithDiff;
    if (typeof window !== 'undefined' && !win.Diff) {
      try {
        const module = await import('diff');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        win.Diff = (module as any).default || module;
      } catch (e) {
        console.error('Failed to load Diff lib', e);
      }
    }
  }

  setMode(m: DiffMode) {
    this.mode.set(m);
    this.computeDiff();
  }

  toggleWhitespace() {
    this.ignoreWhitespace.update((v) => !v);
    this.computeDiff();
  }

  getModeClass(m: string) {
    return this.mode() === m
      ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white';
  }

  clear() {
    this.textA.set('');
    this.textB.set('');
    this.diffRows.set([]);
    this.stats.set({ additions: 0, deletions: 0, changes: 0 });
    this.saveState();
  }

  swap() {
    const temp = this.textA();
    this.textA.set(this.textB());
    this.textB.set(temp);
    this.computeDiff();
  }

  autoDiff() {
    // Optional: Debounce this in future. For now, immediate.
    this.saveState();
  }

  computeDiff() {
    this.saveState();

    const win = window as unknown as WindowWithDiff;
    if (typeof window === 'undefined' || !win.Diff) return;
    if (!this.textA() && !this.textB()) {
      this.diffRows.set([]);
      return;
    }

    const diffLib = win.Diff;
    const options = { ignoreWhitespace: this.ignoreWhitespace() };

    let changes: DiffChange[];

    if (this.mode() === 'Chars') changes = diffLib.diffChars(this.textA(), this.textB(), options);
    else if (this.mode() === 'Words')
      changes = diffLib.diffWords(this.textA(), this.textB(), options);
    else changes = diffLib.diffLines(this.textA(), this.textB(), options);

    const rendered = buildDiffRows(changes, this.mode());
    this.diffRows.set(rendered.rows);
    this.stats.set(rendered.stats);
  }

  saveState() {
    if (this.isWidget()) {
      const cfg = this.widgetConfig();
      if (cfg && cfg.instanceId) {
        this.toolService.updateWidgetData(cfg.instanceId, {
          diffData: {
            a: this.textA(),
            b: this.textB(),
          },
        });
      }
    }
  }
}
