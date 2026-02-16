
import { Component, inject, signal, computed, input, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ToolService } from '../../services/tool.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
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

interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
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

interface DiffRow {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
  oldLine?: number;
  newLine?: number;
}

@Component({
  selector: 'app-diff-checker',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    /* GitHub-like Diff Styles */
    .diff-table {
      width: 100%;
      border-collapse: collapse;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
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
    .diff-added .diff-num { background-color: #ccffd8; border-right-color: #bef5cb; }
    .diff-added .diff-code { background-color: #e6ffec; }
    .dark .diff-added .diff-num { background-color: #1f3625; border-right-color: #2ea04366; }
    .dark .diff-added .diff-code { background-color: #1a3222; }

    /* Removed Lines */
    .diff-removed .diff-num { background-color: #ffd7d5; border-right-color: #ffdce0; }
    .diff-removed .diff-code { background-color: #ffebe9; }
    .dark .diff-removed .diff-num { background-color: #3e1f23; border-right-color: #f8514966; }
    .dark .diff-removed .diff-code { background-color: #35181c; }

    /* Markers */
    .diff-marker {
      user-select: none;
      margin-right: 4px;
      color: #6e7781;
      display: inline-block;
      width: 10px;
    }
    
    /* Widget Compact Overrides */
    .widget-diff .diff-table { font-size: 10px; line-height: 1.3; }
    .widget-diff .diff-num { min-width: 20px; padding: 0 2px; }
    .widget-diff .diff-code { padding: 0 4px; }
  `],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="diff-checker">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- WIDGET MODE (Shared logic for 3x1 and 2x2) -->
      <div class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative group widget-diff">
         
         <!-- Widget Header & Controls -->
         <div class="flex items-center justify-between p-1.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <!-- Params -->
            <div class="flex items-center gap-1">
               <select [(ngModel)]="mode" (change)="computeDiff()" class="text-[9px] font-bold uppercase bg-transparent border-none focus:ring-0 p-0 text-primary cursor-pointer">
                  <option value="Lines">Line</option>
                  <option value="Words">Word</option>
                  <option value="Chars">Char</option>
               </select>
               <button 
                  (click)="toggleWhitespace()" 
                  [class.text-primary]="ignoreWhitespace()" 
                  [class.text-slate-400]="!ignoreWhitespace()"
                  class="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Ignore Whitespace"
               >
                  <span class="material-symbols-outlined text-sm">space_bar</span>
               </button>
            </div>

            <!-- Tab Switcher -->
            <div class="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg">
               <button 
                  (click)="widgetTab.set('input')" 
                  class="px-2 py-0.5 text-[9px] font-bold rounded transition-all"
                  [class.bg-white]="widgetTab() === 'input'"
                  [class.text-primary]="widgetTab() === 'input'"
                  [class.shadow-sm]="widgetTab() === 'input'"
                  [class.text-slate-500]="widgetTab() !== 'input'"
               >{{ t.map()['W_TAB_INPUT'] }}</button>
               <button 
                  (click)="widgetTab.set('diff')" 
                  (click)="computeDiff()"
                  class="px-2 py-0.5 text-[9px] font-bold rounded transition-all"
                  [class.bg-white]="widgetTab() === 'diff'"
                  [class.text-primary]="widgetTab() === 'diff'"
                  [class.shadow-sm]="widgetTab() === 'diff'"
                  [class.text-slate-500]="widgetTab() !== 'diff'"
               >{{ t.map()['W_TAB_DIFF'] }}</button>
            </div>
         </div>

         <!-- Widget Body -->
         <div class="flex-1 overflow-hidden relative">
            
            <!-- INPUT TAB -->
            @if (widgetTab() === 'input') {
               <div class="h-full flex" [class.flex-col]="!isWideWidget()">
                  <!-- Input A -->
                  <div class="flex-1 flex flex-col p-2 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700 relative">
                     <div class="text-[9px] font-bold uppercase text-slate-400 mb-1 flex justify-between">
                        <span>{{ t.map()['ORIGINAL_LABEL'] }}</span>
                        <button (click)="textA.set('')" *ngIf="textA()" class="hover:text-red-500"><span class="material-symbols-outlined text-[10px]">close</span></button>
                     </div>
                     <textarea [(ngModel)]="textA" (input)="autoDiff()" [placeholder]="t.map()['W_PASTE_ORIG']" class="flex-1 w-full bg-transparent resize-none border-none text-xs focus:ring-0 p-0 placeholder-slate-300"></textarea>
                  </div>
                  
                  <!-- Input B -->
                  <div class="flex-1 flex flex-col p-2 relative">
                     <div class="text-[9px] font-bold uppercase text-slate-400 mb-1 flex justify-between">
                        <span>{{ t.map()['MODIFIED_LABEL'] }}</span>
                        <button (click)="textB.set('')" *ngIf="textB()" class="hover:text-red-500"><span class="material-symbols-outlined text-[10px]">close</span></button>
                     </div>
                     <textarea [(ngModel)]="textB" (input)="autoDiff()" [placeholder]="t.map()['W_PASTE_MOD']" class="flex-1 w-full bg-transparent resize-none border-none text-xs focus:ring-0 p-0 placeholder-slate-300"></textarea>
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
                                 <tr class="diff-row" 
                                     [class.diff-added]="row.type === 'added'" 
                                     [class.diff-removed]="row.type === 'removed'">
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
                           <div class="flex flex-col items-center justify-center h-full text-green-500 p-4">
                              <span class="material-symbols-outlined text-3xl">check_circle</span>
                              <span class="text-xs font-bold mt-1">{{ t.map()['NO_DIFF'] }}</span>
                           </div>
                        }
                     }
                  } @else {
                     <div class="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                        <span class="material-symbols-outlined text-2xl mb-1">difference</span>
                        <span class="text-xs">{{ t.map()['W_HINT'] }}</span>
                     </div>
                  }
               </div>
               
               <!-- Floating Stats Overlay -->
               @if (hasResult() && stats().changes > 0) {
                  <div class="absolute bottom-2 right-2 bg-slate-900/80 text-white px-2 py-1 rounded text-[9px] font-mono shadow-lg backdrop-blur pointer-events-none">
                     <span class="text-green-400">+{{ stats().additions }}</span> / <span class="text-red-400">-{{ stats().deletions }}</span>
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
         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left -->
            <div class="flex flex-col gap-2">
               <div class="flex justify-between items-center px-1">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ t.map()['ORIGINAL_LABEL'] }}</label>
                  <button (click)="textA.set('')" class="text-[10px] text-slate-400 hover:text-red-500 uppercase" [class.opacity-0]="!textA()">{{ t.map()['BTN_CLEAR'] }}</button>
               </div>
               <div class="relative group">
                  <textarea 
                     [(ngModel)]="textA" 
                     (input)="computeDiff()"
                     [placeholder]="t.map()['PLACEHOLDER_ORIG']"
                     class="w-full h-40 md:h-64 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:outline-none resize-none font-mono text-xs md:text-sm leading-relaxed"
                  ></textarea>
               </div>
            </div>

            <!-- Right -->
            <div class="flex flex-col gap-2">
               <div class="flex justify-between items-center px-1">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ t.map()['MODIFIED_LABEL'] }}</label>
                  <button (click)="textB.set('')" class="text-[10px] text-slate-400 hover:text-red-500 uppercase" [class.opacity-0]="!textB()">{{ t.map()['BTN_CLEAR'] }}</button>
               </div>
               <div class="relative group">
                  <textarea 
                     [(ngModel)]="textB" 
                     (input)="computeDiff()"
                     [placeholder]="t.map()['PLACEHOLDER_MOD']"
                     class="w-full h-40 md:h-64 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:outline-none resize-none font-mono text-xs md:text-sm leading-relaxed"
                  ></textarea>
               </div>
            </div>
         </div>

         <!-- Toolbar / Controls -->
         <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-2 flex flex-col md:flex-row items-center gap-4">
            
            <!-- Parameters -->
            <div class="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-x-auto max-w-full">
               <button (click)="setMode('Lines')" [class]="getModeClass('Lines')" class="px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap">{{ t.map()['MODE_LINES'] }}</button>
               <button (click)="setMode('Words')" [class]="getModeClass('Words')" class="px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap">{{ t.map()['MODE_WORDS'] }}</button>
               <button (click)="setMode('Chars')" [class]="getModeClass('Chars')" class="px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap">{{ t.map()['MODE_CHARS'] }}</button>
            </div>

            <!-- Options -->
            <div class="flex items-center gap-4 px-2">
               <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" [(ngModel)]="ignoreWhitespace" (change)="computeDiff()" class="rounded border-slate-300 text-primary focus:ring-primary">
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{{ t.map()['OPT_WHITESPACE'] }}</span>
               </label>
            </div>

            <!-- Spacer -->
            <div class="flex-1"></div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
               <button (click)="swap()" class="p-2 text-slate-500 hover:text-primary transition-colors" [title]="t.map()['BTN_SWAP']">
                  <span class="material-symbols-outlined">swap_horiz</span>
               </button>
               <button (click)="clear()" class="p-2 text-slate-500 hover:text-red-500 transition-colors" [title]="t.map()['BTN_CLEAR']">
                  <span class="material-symbols-outlined">delete_sweep</span>
               </button>
            </div>
         </div>

         <!-- Diff Result (GitHub Style) -->
         @if (hasResult()) {
            <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
               <!-- Header -->
               <div class="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div class="flex items-center gap-4 text-xs font-mono">
                     <span class="font-bold text-slate-700 dark:text-slate-200">{{ stats().changes }} {{ t.map()['STATS_CHANGES'] }}</span>
                     <span class="text-green-600 font-medium">+{{ stats().additions }} {{ t.map()['STATS_ADD'] }}</span>
                     <span class="text-red-600 font-medium">-{{ stats().deletions }} {{ t.map()['STATS_DEL'] }}</span>
                  </div>
               </div>

               <!-- Table -->
               <div class="overflow-x-auto">
                  <table class="diff-table">
                     <tbody>
                        @for (row of diffRows(); track $index) {
                           <tr class="diff-row" 
                               [class.diff-added]="row.type === 'added'" 
                               [class.diff-removed]="row.type === 'removed'">
                              
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
                        <span class="material-symbols-outlined text-4xl mb-2 text-green-500">check_circle</span>
                        <p class="font-medium">{{ t.map()['NO_DIFF'] }}</p>
                     </div>
                  }
               </div>
            </div>
         }
      </div>
    </ng-template>
  `
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
  mode = signal<'Chars' | 'Words' | 'Lines'>('Lines');
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

  setMode(m: 'Chars' | 'Words' | 'Lines') {
     this.mode.set(m);
     this.computeDiff();
  }
  
  toggleWhitespace() {
     this.ignoreWhitespace.update(v => !v);
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
     else if (this.mode() === 'Words') changes = diffLib.diffWords(this.textA(), this.textB(), options);
     else changes = diffLib.diffLines(this.textA(), this.textB(), options);

     const rows: DiffRow[] = [];
     let oldLine = 1;
     let newLine = 1;
     let additions = 0;
     let deletions = 0;

     changes.forEach((part: DiffChange) => {
        const lines = part.value.split('\n');
        
        // Fix for trailing newline in diffLines
        if (lines.length > 0 && lines[lines.length - 1] === '' && (this.mode() === 'Lines')) {
           lines.pop();
        }

        if (this.mode() !== 'Lines') {
           // For Chars/Words, we just treat them as inline chunks
           if (part.added) {
              additions++;
              rows.push({ type: 'added', content: part.value });
           } else if (part.removed) {
              deletions++;
              rows.push({ type: 'removed', content: part.value });
           } else {
              rows.push({ type: 'unchanged', content: part.value });
           }
           return; 
        }

        // Line Logic
        lines.forEach((line: string) => {
           if (part.added) {
              additions++;
              rows.push({ type: 'added', content: line, newLine: newLine++ });
           } else if (part.removed) {
              deletions++;
              rows.push({ type: 'removed', content: line, oldLine: oldLine++ });
           } else {
              rows.push({ type: 'unchanged', content: line, oldLine: oldLine++, newLine: newLine++ });
           }
        });
     });

     this.diffRows.set(rows);
     this.stats.set({ 
        additions, 
        deletions, 
        changes: additions + deletions 
     });
  }

  saveState() {
     if (this.isWidget()) {
        const cfg = this.widgetConfig();
        if (cfg && cfg.instanceId) {
           this.toolService.updateWidgetData(cfg.instanceId, {
              diffData: {
                 a: this.textA(),
                 b: this.textB()
              }
           });
        }
     }
  }
}
