import { Component, signal, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ClipboardService } from '../../services/clipboard.service';
import { PersistenceService } from '../../services/persistence.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-password-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="password-generator">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative">
        
        <!-- Condition based on size -->
        @if (widgetConfig()?.cols === 1 && widgetConfig()?.rows === 1) {
           <!-- Compact 1x1 Mode -->
           <div class="flex-1 flex flex-col items-center justify-center p-2 text-center relative group cursor-pointer" (click)="copy()">
              <span class="material-symbols-outlined text-3xl text-primary mb-1">key</span>
              <div class="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">{{ t.map()['CONFIG_TITLE'] }}</div>
              
              <!-- Hidden overlay hint -->
              <div class="absolute inset-0 bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl z-10">
                 <span class="text-white font-bold text-xs">{{ t.map()['BTN_COPY'] }}</span>
              </div>

              <!-- Password Display (Truncated) -->
              <div class="w-full px-2">
                 <div class="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{{ password() }}</div>
              </div>
           </div>
           
           <button (click)="regenerate()" class="absolute top-1 right-1 p-1 text-slate-300 hover:text-primary z-20">
              <span class="material-symbols-outlined text-sm">refresh</span>
           </button>
        } @else {
           <!-- Standard/Wide Mode -->
           <div class="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div class="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <span class="material-symbols-outlined text-lg">key</span>
                <span class="text-xs font-bold uppercase tracking-wider">{{ t.map()['CONFIG_TITLE'] }}</span>
              </div>
              <button (click)="regenerate()" class="text-slate-400 hover:text-primary transition-colors" title="Regenerate">
                <span class="material-symbols-outlined text-lg">refresh</span>
              </button>
           </div>

           <div class="flex-1 p-4 flex flex-col justify-center gap-3">
              <!-- Simplified Controls -->
              <div class="flex items-center gap-2">
                 <input type="range" min="6" max="32" [(ngModel)]="length" (input)="regenerate()" class="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary">
                 <span class="text-xs font-mono font-bold text-slate-500 w-6 text-right">{{ length() }}</span>
              </div>
              
              <!-- Result Area -->
              <div class="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 text-center break-all font-mono text-sm font-bold text-slate-800 dark:text-slate-100 select-all border border-slate-200 dark:border-slate-700">
                 {{ password() }}
              </div>

              <button (click)="copy()" class="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                 <span class="material-symbols-outlined text-sm">content_copy</span>
                 {{ t.map()['BTN_COPY'] }}
              </button>
           </div>
        }
      </div>
    }

    <!-- Main Content Template -->
    <ng-template #mainContent>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Settings Panel -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 class="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-xs">
              <span class="material-symbols-outlined text-lg">tune</span> {{ t.map()['CONFIG_TITLE'] }}
            </h3>
            
            <div class="space-y-6">
              <div>
                <div class="flex justify-between mb-2">
                  <label class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.map()['LABEL_LENGTH'] }}</label>
                  <span class="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{{ length() }}</span>
                </div>
                <input 
                  type="range" 
                  min="6" 
                  max="64" 
                  [(ngModel)]="length" 
                  (input)="regenerate()"
                  class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                >
              </div>

              <div class="space-y-3">
                <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <input type="checkbox" [(ngModel)]="useUppercase" (change)="regenerate()" class="w-5 h-5 text-primary rounded focus:ring-primary border-slate-300">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t.map()['LABEL_UPPERCASE'] }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['DESC_UPPERCASE'] }}</span>
                  </div>
                </label>
                
                <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <input type="checkbox" [(ngModel)]="useLowercase" (change)="regenerate()" class="w-5 h-5 text-primary rounded focus:ring-primary border-slate-300">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t.map()['LABEL_LOWERCASE'] }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['DESC_LOWERCASE'] }}</span>
                  </div>
                </label>
                
                <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <input type="checkbox" [(ngModel)]="useNumbers" (change)="regenerate()" class="w-5 h-5 text-primary rounded focus:ring-primary border-slate-300">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t.map()['LABEL_NUMBERS'] }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['DESC_NUMBERS'] }}</span>
                  </div>
                </label>
                
                <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <input type="checkbox" [(ngModel)]="useSymbols" (change)="regenerate()" class="w-5 h-5 text-primary rounded focus:ring-primary border-slate-300">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t.map()['LABEL_SYMBOLS'] }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['DESC_SYMBOLS'] }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Result Panel -->
        <div class="lg:col-span-2">
           <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center h-full text-center space-y-8">
              
              <div class="w-full max-w-xl">
                 <div class="relative group">
                   <div class="absolute inset-0 bg-primary/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                   <div class="relative bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex items-center justify-center break-all min-h-[8rem]">
                      <span class="text-3xl sm:text-5xl font-mono font-bold text-slate-800 dark:text-slate-100 tracking-wider selection:bg-primary selection:text-white">
                        {{ password() }}
                      </span>
                   </div>
                 </div>
              </div>

              <!-- Strength Meter -->
              <div class="w-full max-w-md space-y-3">
                <div class="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>{{ t.map()['STRENGTH_TITLE'] }}</span>
                  <span [class.text-red-500]="strengthScore() <= 1"
                        [class.text-yellow-500]="strengthScore() === 2"
                        [class.text-blue-500]="strengthScore() === 3"
                        [class.text-green-500]="strengthScore() === 4">{{ strengthLabel() }}</span>
                </div>
                <div class="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1 p-1">
                  <div class="flex-1 rounded-full transition-colors duration-500" [class.bg-red-500]="strengthScore() >= 1"></div>
                  <div class="flex-1 rounded-full transition-colors duration-500" [class.bg-slate-200]="strengthScore() < 2" [class.dark:bg-slate-600]="strengthScore() < 2" [class.bg-yellow-500]="strengthScore() >= 2"></div>
                  <div class="flex-1 rounded-full transition-colors duration-500" [class.bg-slate-200]="strengthScore() < 3" [class.dark:bg-slate-600]="strengthScore() < 3" [class.bg-blue-500]="strengthScore() >= 3"></div>
                  <div class="flex-1 rounded-full transition-colors duration-500" [class.bg-slate-200]="strengthScore() < 4" [class.dark:bg-slate-600]="strengthScore() < 4" [class.bg-green-500]="strengthScore() >= 4"></div>
                </div>
              </div>

              <div class="flex flex-wrap justify-center gap-4 w-full">
                <button 
                  (click)="regenerate()" 
                  class="flex-1 sm:flex-none inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-xl shadow-lg shadow-primary/20 text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-95 hover:-translate-y-0.5"
                >
                  <span class="material-symbols-outlined mr-2">refresh</span>
                  {{ t.map()['BTN_REGENERATE'] }}
                </button>
                
                <button 
                  (click)="copy()" 
                  class="flex-1 sm:flex-none inline-flex items-center justify-center px-8 py-4 border border-slate-200 dark:border-slate-700 text-base font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all active:scale-95"
                >
                  <span class="material-symbols-outlined mr-2">content_copy</span>
                  {{ t.map()['BTN_COPY'] }}
                </button>
              </div>
           </div>
        </div>
      </div>
    </ng-template>
  `
})
export class PasswordGeneratorComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  clipboard = inject(ClipboardService);
  persistence = inject(PersistenceService);

  length = signal<number>(16);
  useUppercase = signal<boolean>(true);
  useLowercase = signal<boolean>(true);
  useNumbers = signal<boolean>(true);
  useSymbols = signal<boolean>(true);
  
  password = signal<string>('');

  strengthScore = computed(() => {
    let score = 0;
    if (this.length() > 8) score++;
    if (this.length() > 12) score++;
    if (this.useUppercase()) score++;
    if (this.useLowercase()) score++;
    if (this.useNumbers()) score++;
    if (this.useSymbols()) score++;
    // Normalize to 0-4
    return Math.min(4, Math.floor(score / 1.5));
  });

  strengthLabel = computed(() => {
     const score = this.strengthScore();
     const map: Record<number, string> = {
        0: this.t.map()['STRENGTH_WEAK'],
        1: this.t.map()['STRENGTH_WEAK'],
        2: this.t.map()['STRENGTH_FAIR'],
        3: this.t.map()['STRENGTH_GOOD'],
        4: this.t.map()['STRENGTH_STRONG']
     };
     return map[score] || map[0];
  });

  constructor() {
    // Persist settings
    this.persistence.storage(this.length, 'pwd-len', 'number');
    this.persistence.storage(this.useUppercase, 'pwd-upper', 'boolean');
    this.persistence.storage(this.useLowercase, 'pwd-lower', 'boolean');
    this.persistence.storage(this.useNumbers, 'pwd-num', 'boolean');
    this.persistence.storage(this.useSymbols, 'pwd-sym', 'boolean');

    this.regenerate();
  }

  regenerate() {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = '';
    if (this.useLowercase()) chars += lower;
    if (this.useUppercase()) chars += upper;
    if (this.useNumbers()) chars += nums;
    if (this.useSymbols()) chars += syms;

    if (!chars) {
      this.password.set('');
      return;
    }

    let result = '';
    const len = this.length();
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.password.set(result);
  }

  copy() {
    this.clipboard.copy(this.password(), 'Password Generator');
  }
}