import { Component, signal, computed, inject, input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { compareHashes, formatFileSize, normalizeHash } from './hash-generator.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
type InputMode = 'text' | 'file';

@Component({
  selector: 'app-hash-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="hash-generator">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div class="flex h-full flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-800">
        @if (viewMode() === 'wide') {
          <!-- Compact Widget Mode -->
          <div
            class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div class="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <span class="material-symbols-outlined text-lg">fingerprint</span>
              <span class="text-xs font-bold tracking-wider uppercase">{{ t.map()['TITLE'] }}</span>
            </div>
            <select
              [(ngModel)]="algorithm"
              (ngModelChange)="calculateHash()"
              class="rounded border-0 bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            >
              @for (algo of algorithms; track algo) {
                <option [value]="algo">{{ algo }}</option>
              }
            </select>
          </div>
          <div class="flex flex-1 flex-col gap-2 p-3">
            <input
              type="text"
              [(ngModel)]="inputText"
              (ngModelChange)="calculateHash()"
              [placeholder]="t.map()['INPUT_PLACEHOLDER']"
              class="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
            <div
              class="flex-1 cursor-pointer overflow-auto rounded-lg bg-slate-100 p-2 font-mono text-xs break-all text-slate-800 transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              (click)="copyHash()"
            >
              {{ hashResult() || '—' }}
            </div>
          </div>
        } @else {
          <!-- Standard Widget Mode -->
          <div
            class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div class="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <span class="material-symbols-outlined text-lg">fingerprint</span>
              <span class="text-xs font-bold tracking-wider uppercase">{{ t.map()['TITLE'] }}</span>
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-3 overflow-auto p-4">
            <select
              [(ngModel)]="algorithm"
              (ngModelChange)="calculateHash()"
              class="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              @for (algo of algorithms; track algo) {
                <option [value]="algo">{{ algo }}</option>
              }
            </select>
            <textarea
              [(ngModel)]="inputText"
              (ngModelChange)="calculateHash()"
              [placeholder]="t.map()['INPUT_PLACEHOLDER']"
              rows="3"
              class="w-full resize-none rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            ></textarea>
            <div
              class="rounded-lg border border-slate-200 bg-slate-100 p-3 font-mono text-xs break-all text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {{ hashResult() || '—' }}
            </div>
            <button
              (click)="copyHash()"
              [disabled]="!hashResult()"
              class="bg-primary flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-sm">content_copy</span>
              {{ copied() ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
            </button>
          </div>
        }
      </div>
    }

    <!-- Main Content Template -->
    <ng-template #mainContent>
      <div class="grid grid-cols-1 gap-8 pb-8 lg:grid-cols-3">
        <!-- Settings Panel -->
        <div class="space-y-6 lg:col-span-1">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h3
              class="mb-6 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-900 uppercase dark:text-white"
            >
              <span class="material-symbols-outlined text-lg">tune</span>
              {{ t.map()['ALGORITHM_LABEL'] }}
            </h3>

            <div class="space-y-3">
              @for (algo of algorithms; track algo) {
                <button
                  (click)="algorithm.set(algo); calculateHash()"
                  class="flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all"
                  [class]="
                    algorithm() === algo
                      ? 'bg-primary shadow-primary/25 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                  "
                >
                  <span class="font-medium">{{ algo }}</span>
                  @if (algorithm() === algo) {
                    <span class="material-symbols-outlined text-sm">check</span>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Options Panel -->
          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h3
              class="mb-6 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-900 uppercase dark:text-white"
            >
              <span class="material-symbols-outlined text-lg">settings</span>
              {{ t.map()['OPTIONS_TITLE'] }}
            </h3>

            <div
              class="flex cursor-pointer items-center justify-between"
              (click)="toggleUppercase()"
            >
              <span class="text-sm text-slate-700 dark:text-slate-300">{{
                t.map()['UPPERCASE_LABEL']
              }}</span>
              <div class="relative">
                <div
                  class="h-6 w-11 rounded-full transition-colors"
                  [class]="uppercase() ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'"
                >
                  <div
                    class="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white transition-transform"
                    [class.translate-x-5]="uppercase()"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Input/Output Panel -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Mode Toggle -->
          <div
            class="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="flex">
              <button
                (click)="inputMode.set('text')"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all"
                [class]="
                  inputMode() === 'text'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                "
              >
                <span class="material-symbols-outlined text-lg">text_fields</span>
                {{ t.map()['MODE_TEXT'] }}
              </button>
              <button
                (click)="inputMode.set('file')"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all"
                [class]="
                  inputMode() === 'file'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                "
              >
                <span class="material-symbols-outlined text-lg">upload_file</span>
                {{ t.map()['MODE_FILE'] }}
              </button>
            </div>
          </div>

          <!-- Input Area -->
          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h3
              class="mb-4 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-900 uppercase dark:text-white"
            >
              <span class="material-symbols-outlined text-lg">input</span>
              {{ t.map()['INPUT_LABEL'] }}
            </h3>

            @if (inputMode() === 'text') {
              <textarea
                [(ngModel)]="inputText"
                (ngModelChange)="calculateHash()"
                [placeholder]="t.map()['INPUT_PLACEHOLDER']"
                rows="6"
                class="focus:ring-primary/50 focus:border-primary w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-800 transition-all focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              ></textarea>
            } @else {
              <div
                class="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all"
                [ngClass]="
                  selectedFile()
                    ? 'border-primary bg-indigo-50 dark:bg-indigo-900/20'
                    : 'hover:border-primary border-slate-300 hover:bg-indigo-50 dark:border-slate-600 dark:hover:bg-indigo-900/20'
                "
                (click)="fileInput.click()"
                (dragover)="onDragOver($event)"
                (drop)="onFileDrop($event)"
              >
                <input #fileInput type="file" class="hidden" (change)="onFileSelect($event)" />

                @if (selectedFile()) {
                  <div class="flex flex-col items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-4xl">description</span>
                    <div>
                      <p class="font-medium text-slate-900 dark:text-white">
                        {{ selectedFile()?.name }}
                      </p>
                      <p class="text-sm text-slate-500">
                        {{ formatFileSize(selectedFile()?.size || 0) }}
                      </p>
                    </div>
                    <button
                      (click)="clearFile($event)"
                      class="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
                    >
                      <span class="material-symbols-outlined text-sm">close</span>
                      {{ t.map()['BTN_CLEAR'] }}
                    </button>
                  </div>
                } @else {
                  <div class="flex flex-col items-center gap-3 text-slate-500">
                    <span class="material-symbols-outlined text-4xl">cloud_upload</span>
                    <p>{{ t.map()['FILE_DROP_LABEL'] }}</p>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Result Area -->
          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="mb-4 flex items-center justify-between">
              <h3
                class="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-900 uppercase dark:text-white"
              >
                <span class="material-symbols-outlined text-lg">fingerprint</span>
                {{ t.map()['RESULT_LABEL'] }} ({{ algorithm() }})
              </h3>
              <div class="flex gap-2">
                <button
                  (click)="clearAll()"
                  class="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  <span class="material-symbols-outlined text-sm">delete</span>
                  {{ t.map()['BTN_CLEAR'] }}
                </button>
                <button
                  (click)="copyHash()"
                  [disabled]="!hashResult()"
                  class="bg-primary flex items-center gap-1 rounded-lg px-4 py-1.5 text-sm text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span class="material-symbols-outlined text-sm">content_copy</span>
                  {{ copied() ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
                </button>
              </div>
            </div>

            <div
              class="flex min-h-[60px] items-center rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              @if (isCalculating()) {
                <div class="flex items-center gap-2 text-slate-500">
                  <span class="material-symbols-outlined animate-spin">progress_activity</span>
                  {{ t.map()['CALCULATING'] }}
                </div>
              } @else {
                <code
                  class="font-mono text-sm break-all text-slate-800 select-all dark:text-slate-100"
                >
                  {{ hashResult() || '—' }}
                </code>
              }
            </div>
          </div>

          <!-- Compare Hash -->
          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h3
              class="mb-4 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-900 uppercase dark:text-white"
            >
              <span class="material-symbols-outlined text-lg">compare</span>
              {{ t.map()['COMPARE_LABEL'] }}
            </h3>

            <div class="flex gap-4">
              <input
                type="text"
                [(ngModel)]="compareHash"
                [placeholder]="t.map()['COMPARE_PLACEHOLDER']"
                class="focus:ring-primary/50 focus:border-primary flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 transition-all focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />

              @if (compareHash() && hashResult()) {
                <div
                  class="flex items-center gap-2 rounded-xl px-4 py-3"
                  [class]="
                    hashesMatch()
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  "
                >
                  <span class="material-symbols-outlined">{{
                    hashesMatch() ? 'check_circle' : 'cancel'
                  }}</span>
                  <span class="text-sm font-medium">{{
                    hashesMatch() ? t.map()['COMPARE_MATCH'] : t.map()['COMPARE_NO_MATCH']
                  }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class HashGeneratorComponent implements OnDestroy {
  t = inject(ScopedTranslationService);
  private clipboard = inject(ClipboardService);
  private worker: Worker | null = null;
  private workerId = 0;

  // Widget inputs
  isWidget = input(false);
  widgetConfig = input<{ cols: number; rows: number } | null>(null);

  viewMode = computed(() => {
    const config = this.widgetConfig();
    return config?.cols === 2 && config?.rows === 1 ? 'wide' : 'default';
  });

  // State
  algorithms: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
  algorithm = signal<HashAlgorithm>('SHA-256');
  inputMode = signal<InputMode>('text');
  inputText = signal('');
  selectedFile = signal<File | null>(null);
  rawHashResult = signal(''); // Hash brut en minuscules
  compareHash = signal('');
  uppercase = signal(false);
  copied = signal(false);
  isCalculating = signal(false);

  // Computed
  hashResult = computed(() => {
    return normalizeHash(this.rawHashResult(), this.uppercase());
  });

  hashesMatch = computed(() => {
    return compareHashes(this.hashResult(), this.compareHash());
  });

  constructor() {
    // Load persisted state from localStorage
    const savedAlgo = localStorage.getItem('hash-generator-algorithm');
    const savedUppercase = localStorage.getItem('hash-generator-uppercase');
    if (savedAlgo && this.algorithms.includes(savedAlgo as HashAlgorithm)) {
      this.algorithm.set(savedAlgo as HashAlgorithm);
    }
    if (savedUppercase !== null) {
      this.uppercase.set(savedUppercase === 'true');
    }
  }

  ngOnDestroy() {
    this.terminateWorker();
  }

  private initWorker() {
    if (!this.worker && typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./hash.worker', import.meta.url), { type: 'module' });
      this.worker.onmessage = ({ data }) => {
        if (data.id === String(this.workerId)) {
          if (data.error) {
            console.error(data.error);
          } else {
            this.rawHashResult.set(data.hash);
          }
          this.isCalculating.set(false);
        }
      };
    }
  }

  private terminateWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  toggleUppercase() {
    this.uppercase.update((v) => !v);
    localStorage.setItem('hash-generator-uppercase', String(this.uppercase()));
  }

  async calculateHash() {
    const text = this.inputText();
    const file = this.selectedFile();
    const algo = this.algorithm();

    // Reset current state
    this.isCalculating.set(true);
    this.workerId++;
    const currentId = String(this.workerId);

    // Initialize worker if needed
    this.initWorker();

    if (this.inputMode() === 'text' && text) {
      this.worker?.postMessage({
        id: currentId,
        data: text,
        algorithm: algo,
        inputType: 'text',
      });
    } else if (this.inputMode() === 'file' && file) {
      try {
        const buffer = await file.arrayBuffer();
        // Transfer the buffer to avoid copy overhead
        this.worker?.postMessage(
          {
            id: currentId,
            data: buffer,
            algorithm: algo,
            inputType: 'file',
          },
          [buffer],
        );
      } catch (e) {
        console.error(e);
        this.isCalculating.set(false);
      }
    } else {
      this.rawHashResult.set('');
      this.isCalculating.set(false);
    }

    // Persist settings
    localStorage.setItem('hash-generator-algorithm', this.algorithm());
    localStorage.setItem('hash-generator-uppercase', String(this.uppercase()));
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
      this.calculateHash();
      // Reset input value to allow selecting the same file again
      input.value = '';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile.set(event.dataTransfer.files[0]);
      this.calculateHash();
    }
  }

  clearFile(event: Event) {
    event.stopPropagation();
    this.selectedFile.set(null);
    this.rawHashResult.set('');
  }

  clearAll() {
    this.inputText.set('');
    this.selectedFile.set(null);
    this.rawHashResult.set('');
    this.compareHash.set('');
  }

  async copyHash() {
    const hash = this.hashResult();
    if (hash) {
      await this.clipboard.copy(hash);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }
}
