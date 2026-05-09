import { Component, inject, signal, input, ElementRef, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { formatBytes, splitPdfByGroups } from './split-pdf.kernel';
// import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface GeneratedFile {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  size: number;
}

@Component({
  selector: 'app-split-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, FileDropDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="split-pdf">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        appFileDrop
        (fileDropped)="handleFileDrop($event)"
        class="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- 1x1 Compact Layout -->
        @if (viewMode() === 'compact') {
          <div
            class="flex h-6 items-center justify-center border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <span class="truncate px-1 text-[9px] font-bold text-slate-500 uppercase">{{
              t.map()['TITLE_SHORT']
            }}</span>
          </div>
          <div class="relative flex flex-1 flex-col items-center justify-center p-1 text-center">
            @if (generatedFiles().length > 0) {
              <!-- Success State -->
              <button
                (click)="downloadAllOrFirst()"
                class="animate-fade-in flex h-full w-full flex-col items-center justify-center bg-green-50 text-green-600 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
              >
                <span class="material-symbols-outlined text-2xl">download</span>
                <span class="mt-1 text-[10px] leading-tight font-bold uppercase">{{
                  generatedFiles().length > 1 ? 'ZIP' : 'Save'
                }}</span>
              </button>
              <button
                (click)="reset()"
                class="absolute top-0 right-0 z-10 rounded-full bg-white/50 p-0.5 text-slate-400 hover:text-slate-600 dark:bg-black/50"
              >
                <span class="material-symbols-outlined text-[10px]">close</span>
              </button>
            } @else if (pdfFile()) {
              <!-- Ready State -->
              <div class="flex h-full w-full flex-col items-center justify-between px-1 py-1">
                <div class="w-full truncate text-center text-[8px] font-bold text-slate-500">
                  {{ pageCount() }} {{ t.map()['PAGES_COUNT'] }}
                </div>
                <input
                  type="text"
                  [(ngModel)]="pageRange"
                  class="focus:ring-primary w-full rounded border bg-slate-50 p-0.5 text-center text-[10px] outline-none focus:ring-1 dark:bg-slate-900"
                  placeholder="1-2"
                />
                <button
                  (click)="splitPdf()"
                  [disabled]="isProcessing()"
                  class="text-primary p-1 hover:text-blue-600"
                >
                  <span class="material-symbols-outlined text-lg">{{
                    isProcessing() ? 'hourglass_top' : 'content_cut'
                  }}</span>
                </button>
              </div>
            } @else {
              <!-- Empty State -->
              <button
                (click)="triggerUpload()"
                class="hover:text-primary flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-slate-400 transition-colors"
              >
                <span class="material-symbols-outlined text-2xl">picture_as_pdf</span>
                <span class="text-[8px] leading-tight font-bold uppercase">{{
                  t.map()['DROP_EXPLICIT']
                }}</span>
              </button>
            }
          </div>
        }
        <!-- 2x1 Wide Layout -->
        @else if (viewMode() === 'wide') {
          <div
            class="flex h-6 items-center justify-between border-b border-slate-100 bg-slate-50 px-2 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <span class="text-[10px] font-bold text-slate-500 uppercase">{{
              t.map()['TITLE']
            }}</span>
            @if (pdfFile() || generatedFiles().length > 0) {
              <button
                (click)="reset()"
                class="hover:text-primary text-[9px] font-bold text-slate-400 uppercase"
              >
                {{ t.map()['BTN_RESET'] }}
              </button>
            }
          </div>
          <div class="flex flex-1 flex-row overflow-hidden">
            <!-- Left: Info/Upload -->
            <div
              class="relative flex w-1/2 flex-col items-center justify-center border-r border-slate-100 bg-slate-50 p-2 text-center transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-800"
            >
              @if (generatedFiles().length > 0) {
                <span class="material-symbols-outlined mb-1 text-2xl text-green-500"
                  >check_circle</span
                >
                <div class="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                  {{ generatedFiles().length }} {{ t.map()['FILES'] }}
                </div>
              } @else if (pdfFile()) {
                <span class="material-symbols-outlined text-primary mb-1 text-2xl"
                  >description</span
                >
                <div
                  class="w-full truncate text-[10px] font-bold text-slate-700 dark:text-slate-200"
                >
                  {{ pdfFile()?.name }}
                </div>
                <div class="text-[9px] text-slate-500">
                  {{ pageCount() }} {{ t.map()['PAGES_COUNT'] }}
                </div>
              } @else {
                <span class="material-symbols-outlined mb-1 text-2xl text-slate-300"
                  >upload_file</span
                >
                <div class="text-[9px] font-medium text-slate-500">{{ t.map()['UPLOAD_PDF'] }}</div>
                <button
                  (click)="triggerUpload()"
                  class="absolute inset-0 z-10 h-full w-full"
                ></button>
              }
            </div>

            <!-- Right: Controls -->
            <div class="flex w-1/2 flex-col justify-center gap-2 p-2">
              @if (generatedFiles().length > 0) {
                <button
                  (click)="downloadAllOrFirst()"
                  class="w-full rounded bg-green-600 py-1.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-green-700"
                >
                  Download
                </button>
              } @else if (pdfFile()) {
                <input
                  type="text"
                  [(ngModel)]="pageRange"
                  class="w-full rounded border bg-white px-1 py-1 text-[10px] dark:bg-slate-900"
                  placeholder="1-5; 6-10"
                />
                <button
                  (click)="splitPdf()"
                  [disabled]="isProcessing() || !pageRange()"
                  class="bg-primary flex w-full items-center justify-center gap-1 rounded py-1 text-[10px] font-bold text-white hover:opacity-90"
                >
                  <span class="material-symbols-outlined text-[12px]">content_cut</span>
                  {{ t.map()['BTN_SPLIT'] }}
                </button>
              } @else {
                <div class="text-center text-[9px] leading-tight text-slate-400 italic">
                  {{ t.map()['DROP_EXPLICIT'] }}
                </div>
              }
            </div>
          </div>
        }
        <!-- 1x2 Tall Layout -->
        @else if (viewMode() === 'tall') {
          <div
            class="flex h-6 items-center justify-center border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <span class="text-[10px] font-bold text-slate-500 uppercase">{{
              t.map()['TITLE_SHORT']
            }}</span>
          </div>
          <div class="flex flex-1 flex-col overflow-hidden">
            <div
              class="relative flex flex-1 flex-col items-center justify-center bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800"
            >
              @if (generatedFiles().length > 0) {
                <span class="material-symbols-outlined mb-2 text-4xl text-green-500">task_alt</span>
                <div class="text-center text-xs font-bold">
                  {{ generatedFiles().length }} {{ t.map()['FILES_READY'] }}
                </div>
              } @else if (pdfFile()) {
                <span class="material-symbols-outlined text-primary mb-2 text-4xl"
                  >picture_as_pdf</span
                >
                <div class="w-full truncate px-2 text-center text-xs font-bold">
                  {{ pdfFile()?.name }}
                </div>
              } @else {
                <span class="material-symbols-outlined mb-2 text-4xl text-slate-300">upload</span>
                <div
                  class="text-center text-[10px] leading-tight font-bold text-slate-500 uppercase"
                >
                  {{ t.map()['DROP_EXPLICIT'] }}
                </div>
                <button
                  (click)="triggerUpload()"
                  class="absolute inset-0 z-10 h-full w-full"
                ></button>
              }
            </div>

            <div
              class="border-t border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              @if (generatedFiles().length > 0) {
                <button
                  (click)="downloadAllOrFirst()"
                  class="mb-2 w-full rounded bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700"
                >
                  Save
                </button>
                <button (click)="reset()" class="w-full text-xs text-slate-400">
                  {{ t.map()['BTN_RESET'] }}
                </button>
              } @else if (pdfFile()) {
                <div class="flex flex-col gap-2">
                  <input
                    type="text"
                    [(ngModel)]="pageRange"
                    class="w-full rounded border p-1.5 text-xs"
                    placeholder="1-5; 6-10"
                  />
                  <button
                    (click)="splitPdf()"
                    [disabled]="isProcessing()"
                    class="bg-primary w-full rounded py-1.5 text-xs font-bold text-white"
                  >
                    {{ t.map()['BTN_SPLIT'] }}
                  </button>
                </div>
              }
            </div>
          </div>
        }
        <!-- Default / Large Layout -->
        @else {
          <div class="flex h-full flex-col">
            <div
              class="bg-primary/5 border-primary/10 flex shrink-0 items-center justify-between border-b p-2"
            >
              <div class="text-primary flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span class="text-xs font-bold uppercase">{{ t.map()['TITLE'] }}</span>
              </div>
              @if (pdfFile() || generatedFiles().length > 0) {
                <button
                  (click)="reset()"
                  class="hover:text-primary text-slate-400 transition-colors"
                  title="Reset"
                >
                  <span class="material-symbols-outlined text-sm">refresh</span>
                </button>
              }
            </div>

            <div
              class="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-4"
            >
              @if (generatedFiles().length > 0) {
                <div class="animate-fade-in space-y-3 text-center">
                  <div
                    class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <span class="material-symbols-outlined text-2xl">check</span>
                  </div>
                  <div class="text-sm font-bold text-slate-900 dark:text-white">
                    {{ generatedFiles().length }} files created
                  </div>
                  <button
                    (click)="downloadAllOrFirst()"
                    class="mx-auto flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:bg-green-700 active:scale-95"
                  >
                    <span class="material-symbols-outlined text-sm">download</span>
                    {{ t.map()['BTN_DOWNLOAD_ALL'] }}
                  </button>
                </div>
              } @else if (pdfFile()) {
                <div class="w-full max-w-[200px] space-y-3 text-center">
                  <div
                    class="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <span class="material-symbols-outlined text-primary">description</span>
                    <span class="truncate text-xs font-bold">{{ pdfFile()?.name }}</span>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="pageRange"
                    class="focus:ring-primary w-full rounded border bg-white p-2 text-sm outline-none focus:ring-2 dark:bg-slate-900"
                    [placeholder]="t.map()['RANGE_PLACEHOLDER']"
                  />
                  <button
                    (click)="splitPdf()"
                    [disabled]="isProcessing() || !pageRange()"
                    class="bg-primary w-full rounded py-2 text-xs font-bold tracking-wide text-white uppercase shadow-sm transition-colors hover:opacity-90"
                  >
                    {{ isProcessing() ? 'Processing...' : t.map()['BTN_SPLIT'] }}
                  </button>
                </div>
              } @else {
                <div (click)="triggerUpload()" class="group cursor-pointer p-4 text-center">
                  <span
                    class="material-symbols-outlined group-hover:text-primary mb-2 text-4xl text-slate-300 transition-transform group-hover:scale-110"
                    >upload_file</span
                  >
                  <p class="text-xs font-bold font-medium text-slate-500 uppercase">
                    {{ t.map()['DROP_EXPLICIT'] }}
                  </p>
                </div>
              }
            </div>
          </div>
        }

        <input
          #fileInput
          type="file"
          accept="application/pdf"
          class="hidden"
          (change)="handleFileSelect($event)"
        />
      </div>
    }

    <!-- Main Content (Full Tool) -->
    <ng-template #mainContent>
      <div
        class="flex min-h-[400px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Upload Area -->
        @if (!pdfFile()) {
          <div
            appFileDrop
            (fileDropped)="handleFileDrop($event)"
            (click)="triggerUpload()"
            class="hover:border-primary group flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-12 transition-all hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800/50"
          >
            <div
              class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 transition-transform group-hover:scale-110 dark:bg-slate-700"
            >
              <span class="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-300"
                >upload_file</span
              >
            </div>
            <h3 class="mb-2 text-xl font-bold text-slate-700 dark:text-slate-200">
              {{ t.map()['SELECT_FILE'] }}
            </h3>
            <p class="text-slate-500">{{ t.map()['DROP_LABEL'] }}</p>
          </div>
        }

        <!-- Editor / Results Area -->
        @else {
          <div class="animate-fade-in flex-1">
            <!-- Header Info -->
            <div
              class="mb-8 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
            >
              <div class="flex items-center gap-4">
                <div
                  class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg"
                >
                  <span class="material-symbols-outlined text-xl">picture_as_pdf</span>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 sm:text-base dark:text-white">
                    {{ pdfFile()?.name }}
                  </h3>
                  <p class="text-xs text-slate-500">
                    {{ pageCount() }} {{ t.map()['PAGES_COUNT'] }}
                  </p>
                </div>
              </div>
              <button
                (click)="reset()"
                class="hover:text-primary p-2 text-slate-400 transition-colors"
                title="Reset"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Input Zone (Only if not processed yet) -->
            @if (generatedFiles().length === 0) {
              <div class="mx-auto max-w-xl space-y-6 py-8">
                <div>
                  <label class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">{{
                    t.map()['RANGE_LABEL']
                  }}</label>
                  <input
                    type="text"
                    [(ngModel)]="pageRange"
                    [placeholder]="t.map()['RANGE_PLACEHOLDER']"
                    class="focus:ring-primary w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <p class="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <span class="material-symbols-outlined text-sm">info</span>
                    {{ t.map()['RANGE_HINT'] }}
                  </p>
                </div>

                <button
                  (click)="splitPdf()"
                  [disabled]="isProcessing() || !pageRange()"
                  class="bg-primary shadow-primary/20 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (isProcessing()) {
                    <span
                      class="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white"
                    ></span>
                    {{ t.map()['PROCESSING'] }}
                  } @else {
                    <span class="material-symbols-outlined">content_cut</span>
                    {{ t.map()['BTN_SPLIT'] }}
                  }
                </button>
              </div>
            }

            <!-- Results List -->
            @else {
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                    {{ t.map()['RESULTS_TITLE'] }}
                  </h3>
                  @if (generatedFiles().length > 1) {
                    <button
                      (click)="downloadAllOrFirst()"
                      class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-green-700"
                    >
                      <span class="material-symbols-outlined">archive</span>
                      {{ t.map()['BTN_DOWNLOAD_ALL'] }}
                    </button>
                  }
                </div>

                <div class="grid gap-3">
                  @for (file of generatedFiles(); track file.id) {
                    <div
                      class="group hover:border-primary/50 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div class="flex items-center gap-3 overflow-hidden">
                        <div
                          class="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded"
                        >
                          <span class="material-symbols-outlined text-lg">description</span>
                        </div>
                        <div class="min-w-0">
                          <div
                            class="truncate text-sm font-bold text-slate-800 dark:text-slate-200"
                          >
                            {{ file.name }}
                          </div>
                          <div class="text-xs text-slate-500">{{ formatBytes(file.size) }}</div>
                        </div>
                      </div>
                      <button
                        (click)="downloadFile(file)"
                        class="hover:text-primary p-2 text-slate-400 transition-colors"
                        [title]="t.map()['BTN_DOWNLOAD']"
                      >
                        <span class="material-symbols-outlined">download</span>
                      </button>
                    </div>
                  }
                </div>

                <div class="pt-6 text-center">
                  <button
                    (click)="reset()"
                    class="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-white"
                  >
                    {{ t.map()['BTN_START_OVER'] }}
                  </button>
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
      </div>
    </ng-template>
  `,
})
export class SplitPdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  // State
  pdfFile = signal<File | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc = signal<any | null>(null);
  pageCount = signal(0);
  pageRange = signal('');
  isProcessing = signal(false);

  // Results
  generatedFiles = signal<GeneratedFile[]>([]);

  // Widget helper
  viewMode = computed(() => {
    const config = this.widgetConfig();
    // 1x1 -> compact
    if (config?.cols === 1 && config?.rows === 1) return 'compact';
    // 2x1 -> wide
    if (config?.cols === 2 && config?.rows === 1) return 'wide';
    // 1x2 -> tall
    if (config?.cols === 1 && config?.rows === 2) return 'tall';
    // Default
    return 'default';
  });

  triggerUpload() {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.loadFile(file);
    input.value = '';
  }

  handleFileDrop(files: FileList) {
    const file = files[0];
    if (file) this.loadFile(file);
  }

  async loadFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      this.toast.show(this.t.get('ERR_INVALID_PDF'), 'error');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      this.pdfFile.set(file);
      this.pdfDoc.set(pdfDoc);
      this.pageCount.set(pdfDoc.getPageCount());
      this.generatedFiles.set([]);
    } catch (e) {
      console.error(e);
      this.toast.show(this.t.get('ERR_INVALID_PDF'), 'error');
    }
  }

  reset() {
    this.pdfFile.set(null);
    this.pdfDoc.set(null);
    this.pageCount.set(0);
    this.pageRange.set('');
    this.generatedFiles.set([]);
  }

  async splitPdf() {
    const sourceFile = this.pdfFile();
    const rangeStr = this.pageRange();

    if (!sourceFile || !rangeStr) return;

    this.isProcessing.set(true);

    try {
      // 1. Split command into groups by semicolon
      const groups = rangeStr
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (groups.length === 0) throw new Error(this.t.get('ERR_INVALID_RANGE'));

      const originalName = this.pdfFile()?.name.replace('.pdf', '') || 'document';

      const sourceBytes = await sourceFile.arrayBuffer();
      const splitResults = await splitPdfByGroups(
        sourceBytes,
        groups,
        this.pageCount(),
        originalName,
      );
      const results: GeneratedFile[] = splitResults.map((result) => {
        const normalizedBytes = new Uint8Array(result.bytes.byteLength);
        normalizedBytes.set(result.bytes);
        const blob = new Blob([normalizedBytes], { type: 'application/pdf' });
        return {
          id: crypto.randomUUID(),
          name: result.name,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
        };
      });

      if (results.length === 0) throw new Error(this.t.get('ERR_INVALID_RANGE'));

      this.generatedFiles.set(results);
      this.toast.show(this.t.get('SUCCESS'), 'success');
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'Error processing PDF';
      this.toast.show(message, 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadFile(file: GeneratedFile) {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async downloadAllOrFirst() {
    const files = this.generatedFiles();
    if (files.length === 0) return;

    if (files.length === 1) {
      this.downloadFile(files[0]);
    } else {
      // Create ZIP
      const zip = new JSZip();
      files.forEach((f) => {
        zip.file(f.name, f.blob);
      });

      try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.pdfFile()?.name.replace('.pdf', '')}-split.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Zip creation failed', e);
        this.toast.show('Failed to create ZIP', 'error');
      }
    }
  }

  formatBytes(bytes: number): string {
    return formatBytes(bytes);
  }
}
