import { Component, signal, computed, inject, input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
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
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="hash-generator">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
        @if (viewMode() === 'wide') {
          <!-- Compact Widget Mode -->
          <div class="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div class="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <span class="material-symbols-outlined text-lg">fingerprint</span>
              <span class="text-xs font-bold uppercase tracking-wider">{{ t.map()['TITLE'] }}</span>
            </div>
            <select 
              [(ngModel)]="algorithm" 
              (ngModelChange)="calculateHash()"
              class="text-xs bg-slate-100 dark:bg-slate-700 border-0 rounded px-2 py-1 text-slate-700 dark:text-slate-200">
              @for (algo of algorithms; track algo) {
                <option [value]="algo">{{ algo }}</option>
              }
            </select>
          </div>
          <div class="flex-1 p-3 flex flex-col gap-2">
            <input 
              type="text" 
              [(ngModel)]="inputText" 
              (ngModelChange)="calculateHash()"
              [placeholder]="t.map()['INPUT_PLACEHOLDER']"
              class="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200">
            <div 
              class="flex-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-2 font-mono text-xs text-slate-800 dark:text-slate-100 break-all overflow-auto cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              (click)="copyHash()">
              {{ hashResult() || '—' }}
            </div>
          </div>
        } @else {
          <!-- Standard Widget Mode -->
          <div class="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div class="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <span class="material-symbols-outlined text-lg">fingerprint</span>
              <span class="text-xs font-bold uppercase tracking-wider">{{ t.map()['TITLE'] }}</span>
            </div>
          </div>
          <div class="flex-1 p-4 flex flex-col gap-3 overflow-auto">
            <select 
              [(ngModel)]="algorithm" 
              (ngModelChange)="calculateHash()"
              class="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200">
              @for (algo of algorithms; track algo) {
                <option [value]="algo">{{ algo }}</option>
              }
            </select>
            <textarea 
              [(ngModel)]="inputText" 
              (ngModelChange)="calculateHash()"
              [placeholder]="t.map()['INPUT_PLACEHOLDER']"
              rows="3"
              class="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 resize-none"></textarea>
            <div class="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-800 dark:text-slate-100 break-all border border-slate-200 dark:border-slate-700">
              {{ hashResult() || '—' }}
            </div>
            <button 
              (click)="copyHash()" 
              [disabled]="!hashResult()"
              class="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-sm">content_copy</span>
              {{ copied() ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
            </button>
          </div>
        }
      </div>
    }

    <!-- Main Content Template -->
    <ng-template #mainContent>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        <!-- Settings Panel -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 class="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-xs">
              <span class="material-symbols-outlined text-lg">tune</span> {{ t.map()['ALGORITHM_LABEL'] }}
            </h3>
            
            <div class="space-y-3">
              @for (algo of algorithms; track algo) {
                <button 
                  (click)="algorithm.set(algo); calculateHash()"
                  class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                  [class]="algorithm() === algo 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'">
                  <span class="font-medium">{{ algo }}</span>
                  @if (algorithm() === algo) {
                    <span class="material-symbols-outlined text-sm">check</span>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Options Panel -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 class="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-xs">
              <span class="material-symbols-outlined text-lg">settings</span> {{ t.map()['OPTIONS_TITLE'] }}
            </h3>
            
            <div class="flex items-center justify-between cursor-pointer" (click)="toggleUppercase()">
              <span class="text-sm text-slate-700 dark:text-slate-300">{{ t.map()['UPPERCASE_LABEL'] }}</span>
              <div class="relative">
                <div 
                  class="w-11 h-6 rounded-full transition-colors"
                  [class]="uppercase() ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'">
                  <div 
                    class="absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform"
                    [class.translate-x-5]="uppercase()"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Input/Output Panel -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Mode Toggle -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2">
            <div class="flex">
              <button 
                (click)="inputMode.set('text')"
                class="flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                [class]="inputMode() === 'text' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'">
                <span class="material-symbols-outlined text-lg">text_fields</span>
                {{ t.map()['MODE_TEXT'] }}
              </button>
              <button 
                (click)="inputMode.set('file')"
                class="flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                [class]="inputMode() === 'file' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'">
                <span class="material-symbols-outlined text-lg">upload_file</span>
                {{ t.map()['MODE_FILE'] }}
              </button>
            </div>
          </div>

          <!-- Input Area -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 class="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide text-xs">
              <span class="material-symbols-outlined text-lg">input</span> {{ t.map()['INPUT_LABEL'] }}
            </h3>
            
            @if (inputMode() === 'text') {
              <textarea 
                [(ngModel)]="inputText" 
                (ngModelChange)="calculateHash()"
                [placeholder]="t.map()['INPUT_PLACEHOLDER']"
                rows="6"
                class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono"></textarea>
            } @else {
              <div 
                class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                [ngClass]="selectedFile() 
                  ? 'border-primary bg-indigo-50 dark:bg-indigo-900/20' 
                  : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/20'"
                (click)="fileInput.click()"
                (dragover)="onDragOver($event)"
                (drop)="onFileDrop($event)">
                <input 
                  #fileInput
                  type="file" 
                  class="hidden"
                  (change)="onFileSelect($event)">
                
                @if (selectedFile()) {
                  <div class="flex flex-col items-center gap-3">
                    <span class="material-symbols-outlined text-4xl text-primary">description</span>
                    <div>
                      <p class="font-medium text-slate-900 dark:text-white">{{ selectedFile()?.name }}</p>
                      <p class="text-sm text-slate-500">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                    </div>
                    <button 
                      (click)="clearFile($event)"
                      class="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
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
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide text-xs">
                <span class="material-symbols-outlined text-lg">fingerprint</span> {{ t.map()['RESULT_LABEL'] }} ({{ algorithm() }})
              </h3>
              <div class="flex gap-2">
                <button 
                  (click)="clearAll()"
                  class="px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">delete</span>
                  {{ t.map()['BTN_CLEAR'] }}
                </button>
                <button 
                  (click)="copyHash()"
                  [disabled]="!hashResult()"
                  class="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">content_copy</span>
                  {{ copied() ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
                </button>
              </div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 min-h-[60px] flex items-center">
              @if (isCalculating()) {
                <div class="flex items-center gap-2 text-slate-500">
                  <span class="material-symbols-outlined animate-spin">progress_activity</span>
                  {{ t.map()['CALCULATING'] }}
                </div>
              } @else {
                <code class="font-mono text-sm text-slate-800 dark:text-slate-100 break-all select-all">
                  {{ hashResult() || '—' }}
                </code>
              }
            </div>
          </div>

          <!-- Compare Hash -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 class="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide text-xs">
              <span class="material-symbols-outlined text-lg">compare</span> {{ t.map()['COMPARE_LABEL'] }}
            </h3>
            
            <div class="flex gap-4">
              <input 
                type="text"
                [(ngModel)]="compareHash"
                [placeholder]="t.map()['COMPARE_PLACEHOLDER']"
                class="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all">
              
              @if (compareHash() && hashResult()) {
                <div class="flex items-center gap-2 px-4 py-3 rounded-xl"
                  [class]="hashesMatch() ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'">
                  <span class="material-symbols-outlined">{{ hashesMatch() ? 'check_circle' : 'cancel' }}</span>
                  <span class="font-medium text-sm">{{ hashesMatch() ? t.map()['COMPARE_MATCH'] : t.map()['COMPARE_NO_MATCH'] }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `
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
    return (config?.cols === 2 && config?.rows === 1) ? 'wide' : 'default';
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
    const raw = this.rawHashResult();
    if (!raw) return '';
    return this.uppercase() ? raw.toUpperCase() : raw.toLowerCase();
  });

  hashesMatch = computed(() => {
    const result = this.hashResult();
    const compare = this.compareHash();
    if (!result || !compare) return false;
    return result.toLowerCase() === compare.toLowerCase();
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
       this.worker = new Worker(new URL('./hash.worker', import.meta.url));
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
    this.uppercase.update(v => !v);
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
         inputType: 'text' 
      });
    } else if (this.inputMode() === 'file' && file) {
      try {
        const buffer = await file.arrayBuffer();
        // Transfer the buffer to avoid copy overhead
        this.worker?.postMessage({ 
           id: currentId,
           data: buffer, 
           algorithm: algo, 
           inputType: 'file' 
        }, [buffer]);
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
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

