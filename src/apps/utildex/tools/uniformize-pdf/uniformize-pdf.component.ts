import { Component, inject, signal, input, ElementRef, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../../../components/tool-layout/tool-layout.component';
import { FileDropDirective } from '../../../../directives/file-drop.directive';
import { ToastService } from '../../../../services/ui/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../../../core/i18n';
import { FORMATS, formatBytes, run } from './uniformize-pdf.kernel';
import { type FormatId } from './uniformize-pdf.schema';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

const FORMAT_LABEL_KEYS: Record<FormatId, string> = {
  a4: 'FORMAT_A4',
  a3: 'FORMAT_A3',
  letter: 'FORMAT_LETTER',
  legal: 'FORMAT_LEGAL',
  tabloid: 'FORMAT_TABLOID',
};

const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

@Component({
  selector: 'app-uniformize-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, FileDropDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="uniformize-pdf">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        appFileDrop
        (fileDropped)="handleFileDrop($event)"
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- 1x1 Compact -->
        @if (viewMode() === 'compact') {
          <div
            class="flex h-6 items-center justify-center border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <span class="truncate px-1 text-[9px] font-bold text-slate-500 uppercase">{{
              t.map()['TITLE_SHORT']
            }}</span>
          </div>
          <div class="relative flex flex-1 flex-col items-center justify-center p-1">
            @if (resultUrl()) {
              <div class="flex h-full w-full flex-col items-center justify-center gap-1">
                <span
                  class="text-center text-[9px] leading-tight font-bold text-green-600 dark:text-green-400"
                  >{{ resultPageCount() }} {{ t.map()['PAGES'] }}</span
                >
                <button
                  (click)="downloadResult()"
                  class="bg-primary w-full rounded py-1 text-[9px] font-bold text-white"
                >
                  {{ t.map()['BTN_DOWNLOAD'] }}
                </button>
              </div>
              <button
                (click)="reset()"
                class="hover:text-primary absolute top-0 right-0 rounded-full bg-white/80 p-0.5 text-slate-400 dark:bg-slate-800/80"
              >
                <span class="material-symbols-outlined text-[10px]">close</span>
              </button>
            } @else if (sourceFile()) {
              <div class="flex h-full w-full flex-col items-center justify-center gap-1">
                <span class="text-[9px] font-bold text-slate-700 dark:text-slate-200">{{
                  sourceFile()?.name
                }}</span>
                <button
                  (click)="uniformize()"
                  [disabled]="isProcessing()"
                  class="bg-primary w-full rounded py-1 text-[9px] font-bold text-white"
                >
                  {{ isProcessing() ? '...' : t.map()['BTN_PROCESS_SHORT'] }}
                </button>
              </div>
            } @else {
              <div
                (click)="triggerUpload()"
                class="hover:text-primary flex h-full w-full cursor-pointer flex-col items-center justify-center p-1 text-center text-slate-400 transition-colors"
              >
                <span class="material-symbols-outlined mb-1 text-2xl">aspect_ratio</span>
                <span class="text-[8px] leading-tight font-bold uppercase">{{
                  t.map()['DROP_EXPLICIT']
                }}</span>
              </div>
            }
          </div>
        }
        <!-- 2x1 Wide -->
        @else if (viewMode() === 'wide') {
          <div
            class="flex h-6 items-center justify-between border-b border-slate-100 bg-slate-50 px-2 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <span class="text-[10px] font-bold text-slate-500 uppercase">{{
              t.map()['TITLE']
            }}</span>
            @if (sourceFile()) {
              <button
                (click)="reset()"
                class="hover:text-primary text-[9px] font-bold text-slate-400 uppercase"
              >
                {{ t.map()['BTN_RESET'] }}
              </button>
            }
          </div>
          <div class="flex flex-1 overflow-hidden">
            <div
              class="relative flex w-1/2 flex-col items-center justify-center border-r border-slate-100 p-2 dark:border-slate-700"
            >
              @if (resultUrl()) {
                <div class="flex w-full flex-col items-center gap-1">
                  <span class="text-center text-xs font-bold text-green-600 dark:text-green-400"
                    >{{ resultPageCount() }} {{ t.map()['PAGES'] }}</span
                  >
                  <button
                    (click)="downloadResult()"
                    class="bg-primary w-full rounded py-1 text-[9px] font-bold text-white"
                  >
                    {{ t.map()['BTN_DOWNLOAD'] }}
                  </button>
                </div>
              } @else if (sourceFile()) {
                <div class="flex w-full flex-col items-center gap-1">
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{
                    sourceFile()?.name
                  }}</span>
                  <select
                    (change)="setFormat($event)"
                    class="w-full rounded border border-slate-200 bg-white p-0.5 text-[9px] text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    @for (fmt of formatIds; track fmt) {
                      <option [value]="fmt" [selected]="selectedFormat() === fmt">
                        {{ t.map()[FORMAT_LABEL_KEYS[fmt]] }}
                      </option>
                    }
                  </select>
                  <button
                    (click)="uniformize()"
                    [disabled]="isProcessing()"
                    class="bg-primary w-full rounded py-1 text-[9px] font-bold text-white"
                  >
                    {{ isProcessing() ? '...' : t.map()['BTN_PROCESS_SHORT'] }}
                  </button>
                </div>
              } @else {
                <div
                  (click)="triggerUpload()"
                  class="flex h-full w-full cursor-pointer flex-col items-center justify-center text-center text-slate-400"
                >
                  <span class="material-symbols-outlined mb-1 text-xl">upload_file</span>
                  <span class="text-[9px] font-bold">{{ t.map()['DROP_EXPLICIT'] }}</span>
                </div>
              }
            </div>
            <div class="flex w-1/2 flex-col justify-center p-2">
              @if (sourceFile() && !resultUrl()) {
                <p class="text-[9px] leading-relaxed text-slate-500">
                  {{ t.map()['PRESERVES_CONTENT'] }}
                </p>
              }
            </div>
          </div>
        }
        <!-- Standard / Large -->
        @else {
          <div class="flex h-full flex-col">
            <div
              class="bg-primary/5 border-primary/10 flex shrink-0 items-center justify-between border-b p-2"
            >
              <div class="text-primary flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">aspect_ratio</span>
                <span class="text-xs font-bold uppercase">{{ t.map()['TITLE'] }}</span>
              </div>
              <div class="flex gap-1">
                <button
                  (click)="reset()"
                  class="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  title="Reset"
                >
                  <span class="material-symbols-outlined text-sm">refresh</span>
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto p-2">
              @if (!sourceFile()) {
                <div
                  (click)="triggerUpload()"
                  class="group flex h-full min-h-[60px] cursor-pointer flex-col items-center justify-center p-4 text-center text-slate-400"
                >
                  <span
                    class="material-symbols-outlined group-hover:text-primary mb-2 text-3xl transition-transform group-hover:scale-110"
                    >upload_file</span
                  >
                  <span class="text-[10px] font-bold uppercase">{{
                    t.map()['DROP_EXPLICIT']
                  }}</span>
                </div>
              } @else if (resultUrl()) {
                <div class="flex flex-col items-center gap-3 p-4">
                  <div class="text-center">
                    <span class="material-symbols-outlined mb-1 text-3xl text-green-500"
                      >check_circle</span
                    >
                    <div class="text-sm font-bold text-green-600 dark:text-green-400">
                      {{ t.map()['SUCCESS'] }}
                    </div>
                    <div class="text-xs text-slate-500">
                      {{ resultPageCount() }} {{ t.map()['PAGES'] }}
                    </div>
                  </div>
                  <button
                    (click)="downloadResult()"
                    class="bg-primary flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold text-white transition-colors hover:opacity-90"
                  >
                    <span class="material-symbols-outlined text-lg">download</span>
                    {{ t.map()['BTN_DOWNLOAD'] }}
                  </button>
                </div>
              } @else {
                <div class="flex flex-col gap-3 p-2">
                  <div
                    class="flex items-center gap-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-700/50"
                  >
                    <div
                      class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg"
                    >
                      <span class="material-symbols-outlined">picture_as_pdf</span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {{ sourceFile()?.name }}
                      </div>
                      <div class="text-xs text-slate-500">
                        {{ formatBytes(sourceFile()!.size) }}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label
                      class="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300"
                      >{{ t.map()['FORMAT'] }}</label
                    >
                    <select
                      (change)="setFormat($event)"
                      class="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      @for (fmt of formatIds; track fmt) {
                        <option [value]="fmt" [selected]="selectedFormat() === fmt">
                          {{ t.map()[FORMAT_LABEL_KEYS[fmt]] }}
                        </option>
                      }
                    </select>
                  </div>
                  <p class="text-[10px] leading-relaxed text-slate-500">
                    {{ t.map()['PRESERVES_CONTENT'] }}
                  </p>
                  @if (isProcessing()) {
                    <div class="flex flex-col items-center gap-2 py-4">
                      <span
                        class="text-primary h-6 w-6 animate-spin rounded-full border-3 border-amber-200 border-t-amber-500"
                      ></span>
                      <span class="text-xs text-slate-500">{{ t.map()['PROCESSING'] }}</span>
                    </div>
                  } @else {
                    <button
                      (click)="uniformize()"
                      class="bg-primary flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
                    >
                      <span class="material-symbols-outlined">aspect_ratio</span>
                      {{ t.map()['BTN_PROCESS'] }}
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    }

    <input
      #fileInput
      type="file"
      accept="application/pdf"
      class="hidden"
      (change)="handleFileSelect($event)"
    />

    <ng-template #mainContent>
      <div
        class="flex min-h-[400px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="mb-6">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ t.map()['TITLE'] }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t.map()['PRESERVES_CONTENT'] }}</p>
        </div>

        @if (!sourceFile()) {
          <div
            appFileDrop
            (fileDropped)="handleFileDrop($event)"
            class="relative flex min-h-[200px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition-all hover:border-amber-400 hover:bg-amber-50/50 dark:border-slate-600 dark:hover:border-amber-500 dark:hover:bg-amber-900/10"
            (click)="triggerUpload()"
          >
            <span class="material-symbols-outlined mb-4 text-5xl text-slate-300 dark:text-slate-500"
              >upload_file</span
            >
            <p class="text-slate-500 dark:text-slate-400">{{ t.map()['DROP_LABEL'] }}</p>
          </div>
        } @else if (resultUrl()) {
          <div class="flex flex-1 flex-col items-center justify-center gap-6">
            <div class="text-center">
              <span class="material-symbols-outlined mb-2 text-5xl text-green-500"
                >check_circle</span
              >
              <h3 class="text-lg font-bold text-green-600 dark:text-green-400">
                {{ t.map()['SUCCESS'] }}
              </h3>
              <p class="text-sm text-slate-500">{{ resultPageCount() }} {{ t.map()['PAGES'] }}</p>
            </div>
            <div class="flex gap-3">
              <button
                (click)="reset()"
                class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {{ t.map()['BTN_RESET'] }}
              </button>
              <button
                (click)="downloadResult()"
                class="bg-primary flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold text-white transition-colors hover:opacity-90"
              >
                <span class="material-symbols-outlined">download</span>
                {{ t.map()['BTN_DOWNLOAD'] }}
              </button>
            </div>
          </div>
        } @else {
          <div class="flex flex-1 flex-col gap-6">
            <div
              class="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div
                class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl"
              >
                <span class="material-symbols-outlined text-2xl">picture_as_pdf</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {{ sourceFile()?.name }}
                </div>
                <div class="text-xs text-slate-500">{{ formatBytes(sourceFile()!.size) }}</div>
              </div>
              <button
                (click)="reset()"
                class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-700"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{{
                t.map()['FORMAT']
              }}</label>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                @for (fmt of formatIds; track fmt) {
                  <button
                    (click)="selectedFormat.set(fmt)"
                    class="rounded-xl border-2 p-3 text-center transition-all"
                    [class.border-amber-500]="selectedFormat() === fmt"
                    [class.bg-amber-50]="selectedFormat() === fmt"
                    [class.dark:bg-amber-900/20]="selectedFormat() === fmt"
                    [class.border-slate-200]="selectedFormat() !== fmt"
                    [class.dark:border-slate-700]="selectedFormat() !== fmt"
                  >
                    <div class="text-xs font-bold text-slate-900 dark:text-white">
                      {{ t.map()[FORMAT_LABEL_KEYS[fmt]] }}
                    </div>
                  </button>
                }
              </div>
            </div>

            <p class="text-sm leading-relaxed text-slate-500">
              {{ t.map()['PRESERVES_CONTENT'] }}
            </p>

            <div class="mt-auto">
              @if (isProcessing()) {
                <div class="flex flex-col items-center gap-3 py-6">
                  <span
                    class="text-primary h-8 w-8 animate-spin rounded-full border-3 border-amber-200 border-t-amber-500"
                  ></span>
                  <span class="text-sm text-slate-500">{{ t.map()['PROCESSING'] }}</span>
                </div>
              } @else {
                <button
                  (click)="uniformize()"
                  class="bg-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
                >
                  <span class="material-symbols-outlined">aspect_ratio</span>
                  {{ t.map()['BTN_PROCESS'] }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class UniformizePdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  sourceFile = signal<File | null>(null);
  selectedFormat = signal<FormatId>('a4');
  isProcessing = signal(false);

  resultUrl = signal<string | null>(null);
  resultBytes = signal<Uint8Array | null>(null);
  resultPageCount = signal<number>(0);

  formatIds = FORMAT_IDS;
  FORMAT_LABEL_KEYS = FORMAT_LABEL_KEYS;

  viewMode = computed(() => {
    const config = this.widgetConfig();
    if (config?.cols === 1 && config?.rows === 1) return 'compact';
    if (config?.cols === 2 && config?.rows === 1) return 'wide';
    return 'default';
  });

  triggerUpload() {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
    input.value = '';
  }

  handleFileDrop(files: FileList) {
    if (files.length > 0) this.setFile(files[0]);
  }

  setFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      this.toast.show(this.t.get('ERR_INVALID'), 'error');
      return;
    }
    this.sourceFile.set(file);
    this.resultUrl.set(null);
    this.resultBytes.set(null);
  }

  setFormat(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedFormat.set(select.value as FormatId);
  }

  reset() {
    this.sourceFile.set(null);
    this.resultUrl.set(null);
    this.resultBytes.set(null);
    this.resultPageCount.set(0);
    this.selectedFormat.set('a4');
  }

  async uniformize() {
    const file = this.sourceFile();
    if (!file) {
      this.toast.show(this.t.get('ERR_NO_FILE'), 'error');
      return;
    }

    this.isProcessing.set(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );

      const result = await run({ sourceBytes: base64, format: this.selectedFormat() });

      const binary = atob(result.bytes);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      this.resultBytes.set(bytes);

      const normalizedBytes = new Uint8Array(bytes.byteLength);
      normalizedBytes.set(bytes);
      const blob = new Blob([normalizedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      this.resultUrl.set(url);
      this.resultPageCount.set(result.pageCount);

      if (this.isWidget()) {
        this.downloadResult();
      } else {
        this.toast.show(this.t.get('SUCCESS'), 'success');
      }
    } catch (e) {
      console.error(e);
      this.toast.show('Uniformization failed', 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult() {
    const url = this.resultUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    const originalName = this.sourceFile()?.name ?? 'document.pdf';
    const baseName = originalName.replace(/\.pdf$/i, '');
    const fmtLabel = this.selectedFormat().toUpperCase();
    a.download = `${baseName}-${fmtLabel}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  formatBytes(bytes: number): string {
    return formatBytes(bytes);
  }
}
