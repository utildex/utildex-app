import { Component, signal, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ClipboardService } from '../../services/clipboard.service';
import { PersistenceService } from '../../services/persistence.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { generatePassword, scorePasswordStrength } from './password-generator.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-password-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="password-generator">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        class="relative flex h-full flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-800"
      >
        @if (viewMode() === 'compact') {
          <!-- Compact 1x1 Mode -->
          <div
            class="group relative flex flex-1 cursor-pointer flex-col items-center justify-center p-2 text-center"
            (click)="copy()"
          >
            <span class="material-symbols-outlined text-primary mb-1 text-3xl">key</span>
            <div class="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {{ t.map()['CONFIG_TITLE'] }}
            </div>

            <!-- Hidden overlay hint -->
            <div
              class="bg-primary/90 absolute inset-0 z-10 flex items-center justify-center rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
            >
              <span class="text-xs font-bold text-white">{{ t.map()['BTN_COPY'] }}</span>
            </div>

            <!-- Password Display (Truncated) -->
            <div class="w-full px-2">
              <div class="truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {{ password() }}
              </div>
            </div>
          </div>

          <button
            (click)="regenerate()"
            class="hover:text-primary absolute top-1 right-1 z-20 p-1 text-slate-300"
          >
            <span class="material-symbols-outlined text-sm">refresh</span>
          </button>
        } @else {
          <!-- Standard/Wide Mode -->
          <div
            class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div class="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <span class="material-symbols-outlined text-lg">key</span>
              <span class="text-xs font-bold tracking-wider uppercase">{{
                t.map()['CONFIG_TITLE']
              }}</span>
            </div>
            <button
              (click)="regenerate()"
              class="hover:text-primary text-slate-400 transition-colors"
              title="Regenerate"
            >
              <span class="material-symbols-outlined text-lg">refresh</span>
            </button>
          </div>

          <div class="flex flex-1 flex-col justify-center gap-3 p-4">
            <!-- Simplified Controls -->
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="6"
                max="32"
                [(ngModel)]="length"
                (input)="regenerate()"
                class="accent-primary h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700"
              />
              <span class="w-6 text-right font-mono text-xs font-bold text-slate-500">{{
                length()
              }}</span>
            </div>

            <!-- Result Area -->
            <div
              class="rounded-lg border border-slate-200 bg-slate-100 p-3 text-center font-mono text-sm font-bold break-all text-slate-800 select-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {{ password() }}
            </div>

            <button
              (click)="copy()"
              class="bg-primary flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              <span class="material-symbols-outlined text-sm">content_copy</span>
              {{ t.map()['BTN_COPY'] }}
            </button>
          </div>
        }
      </div>
    }

    <!-- Main Content Template -->
    <ng-template #mainContent>
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <!-- Settings Panel -->
        <div class="space-y-6 lg:col-span-1">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h3
              class="mb-6 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-900 uppercase dark:text-white"
            >
              <span class="material-symbols-outlined text-lg">tune</span>
              {{ t.map()['CONFIG_TITLE'] }}
            </h3>

            <div class="space-y-6">
              <div>
                <div class="mb-2 flex justify-between">
                  <label class="text-sm font-medium text-slate-700 dark:text-slate-300">{{
                    t.map()['LABEL_LENGTH']
                  }}</label>
                  <span class="text-primary bg-primary/10 rounded px-2 py-0.5 text-sm font-bold">{{
                    length()
                  }}</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="64"
                  [(ngModel)]="length"
                  (input)="regenerate()"
                  class="accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700"
                />
              </div>

              <div class="space-y-3">
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50"
                >
                  <input
                    type="checkbox"
                    [(ngModel)]="useUppercase"
                    (change)="regenerate()"
                    class="text-primary focus:ring-primary h-5 w-5 rounded border-slate-300"
                  />
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{
                      t.map()['LABEL_UPPERCASE']
                    }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['DESC_UPPERCASE'] }}</span>
                  </div>
                </label>

                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50"
                >
                  <input
                    type="checkbox"
                    [(ngModel)]="useLowercase"
                    (change)="regenerate()"
                    class="text-primary focus:ring-primary h-5 w-5 rounded border-slate-300"
                  />
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{
                      t.map()['LABEL_LOWERCASE']
                    }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['DESC_LOWERCASE'] }}</span>
                  </div>
                </label>

                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50"
                >
                  <input
                    type="checkbox"
                    [(ngModel)]="useNumbers"
                    (change)="regenerate()"
                    class="text-primary focus:ring-primary h-5 w-5 rounded border-slate-300"
                  />
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{
                      t.map()['LABEL_NUMBERS']
                    }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['DESC_NUMBERS'] }}</span>
                  </div>
                </label>

                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50"
                >
                  <input
                    type="checkbox"
                    [(ngModel)]="useSymbols"
                    (change)="regenerate()"
                    class="text-primary focus:ring-primary h-5 w-5 rounded border-slate-300"
                  />
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{
                      t.map()['LABEL_SYMBOLS']
                    }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['DESC_SYMBOLS'] }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Result Panel -->
        <div class="lg:col-span-2">
          <div
            class="flex h-full flex-col items-center justify-center space-y-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="w-full max-w-xl">
              <div class="group relative">
                <div
                  class="bg-primary/20 absolute inset-0 rounded-2xl opacity-50 blur-lg transition-opacity duration-500 group-hover:opacity-100"
                ></div>
                <div
                  class="relative flex min-h-[8rem] items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-8 break-all dark:border-slate-700 dark:bg-slate-900"
                >
                  <span
                    class="selection:bg-primary font-mono text-3xl font-bold tracking-wider text-slate-800 selection:text-white sm:text-5xl dark:text-slate-100"
                  >
                    {{ password() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Strength Meter -->
            <div class="w-full max-w-md space-y-3">
              <div
                class="flex justify-between text-xs font-bold tracking-wider text-slate-500 uppercase"
              >
                <span>{{ t.map()['STRENGTH_TITLE'] }}</span>
                <span
                  [class.text-red-500]="strengthScore() <= 1"
                  [class.text-yellow-500]="strengthScore() === 2"
                  [class.text-blue-500]="strengthScore() === 3"
                  [class.text-green-500]="strengthScore() === 4"
                  >{{ strengthLabel() }}</span
                >
              </div>
              <div
                class="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-slate-100 p-1 dark:bg-slate-700"
              >
                <div
                  class="flex-1 rounded-full transition-colors duration-500"
                  [class.bg-red-500]="strengthScore() >= 1"
                ></div>
                <div
                  class="flex-1 rounded-full transition-colors duration-500"
                  [class.bg-slate-200]="strengthScore() < 2"
                  [class.dark:bg-slate-600]="strengthScore() < 2"
                  [class.bg-yellow-500]="strengthScore() >= 2"
                ></div>
                <div
                  class="flex-1 rounded-full transition-colors duration-500"
                  [class.bg-slate-200]="strengthScore() < 3"
                  [class.dark:bg-slate-600]="strengthScore() < 3"
                  [class.bg-blue-500]="strengthScore() >= 3"
                ></div>
                <div
                  class="flex-1 rounded-full transition-colors duration-500"
                  [class.bg-slate-200]="strengthScore() < 4"
                  [class.dark:bg-slate-600]="strengthScore() < 4"
                  [class.bg-green-500]="strengthScore() >= 4"
                ></div>
              </div>
            </div>

            <div class="flex w-full flex-wrap justify-center gap-4">
              <button
                (click)="regenerate()"
                class="shadow-primary/20 bg-primary focus:ring-primary inline-flex flex-1 items-center justify-center rounded-xl border border-transparent px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:outline-none active:scale-95 sm:flex-none"
              >
                <span class="material-symbols-outlined mr-2">refresh</span>
                {{ t.map()['BTN_REGENERATE'] }}
              </button>

              <button
                (click)="copy()"
                class="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 transition-all hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none active:scale-95 sm:flex-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <span class="material-symbols-outlined mr-2">content_copy</span>
                {{ t.map()['BTN_COPY'] }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
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

  viewMode = computed(() => {
    const config = this.widgetConfig();
    return config?.cols === 1 && config?.rows === 1 ? 'compact' : 'full';
  });

  strengthScore = computed(() => {
    return scorePasswordStrength({
      length: this.length(),
      useUppercase: this.useUppercase(),
      useLowercase: this.useLowercase(),
      useNumbers: this.useNumbers(),
      useSymbols: this.useSymbols(),
    });
  });

  strengthLabel = computed(() => {
    const score = this.strengthScore();
    const map: Record<number, string> = {
      0: this.t.map()['STRENGTH_WEAK'],
      1: this.t.map()['STRENGTH_WEAK'],
      2: this.t.map()['STRENGTH_FAIR'],
      3: this.t.map()['STRENGTH_GOOD'],
      4: this.t.map()['STRENGTH_STRONG'],
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
    this.password.set(
      generatePassword({
        length: this.length(),
        useUppercase: this.useUppercase(),
        useLowercase: this.useLowercase(),
        useNumbers: this.useNumbers(),
        useSymbols: this.useSymbols(),
      }),
    );
  }

  copy() {
    this.clipboard.copy(this.password(), 'Password Generator');
  }
}
