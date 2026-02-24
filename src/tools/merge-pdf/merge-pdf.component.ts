import { Component, inject, signal, input, ElementRef, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
// import { PDFDocument } from 'pdf-lib';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface PdfFile {
  id: string;
  file: File;
  pageCount?: number;
}

@Component({
  selector: 'app-merge-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent, FileDropDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="merge-pdf">
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
            @if (files().length > 0) {
              <div class="flex h-full w-full flex-col items-center justify-center gap-1">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200"
                  >{{ files().length }} PDF</span
                >
                <button
                  (click)="merge()"
                  [disabled]="isProcessing()"
                  class="bg-primary w-full rounded py-1 text-[9px] font-bold text-white"
                >
                  {{ isProcessing() ? '...' : t.map()['BTN_MERGE_SHORT'] }}
                </button>
              </div>
              <button
                (click)="reset()"
                class="hover:text-primary absolute top-0 right-0 rounded-full bg-white/80 p-0.5 text-slate-400 dark:bg-slate-800/80"
              >
                <span class="material-symbols-outlined text-[10px]">close</span>
              </button>
            } @else {
              <div
                (click)="triggerUpload()"
                class="hover:text-primary flex h-full w-full cursor-pointer flex-col items-center justify-center p-1 text-center text-slate-400 transition-colors"
              >
                <span class="material-symbols-outlined mb-1 text-2xl">join_full</span>
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
            @if (files().length > 0) {
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
              class="relative flex w-1/2 flex-col items-center justify-center border-r border-slate-100 p-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <div
                (click)="triggerUpload()"
                class="group flex h-full w-full cursor-pointer flex-col items-center justify-center text-center"
              >
                @if (files().length > 0) {
                  <span class="material-symbols-outlined mb-1 text-xl text-green-500"
                    >check_circle</span
                  >
                  <div class="text-[9px] leading-tight font-bold text-slate-500">
                    {{ files().length }} {{ t.map()['FILES'] }}
                  </div>
                } @else {
                  <span
                    class="material-symbols-outlined group-hover:text-primary mb-1 text-xl text-slate-400 transition-colors"
                    >upload_file</span
                  >
                  <div class="text-[9px] leading-tight font-bold text-slate-500">
                    {{ t.map()['UPLOAD_PDF'] }}
                  </div>
                }
              </div>
              <button
                (click)="triggerUpload()"
                class="absolute inset-0 z-10 h-full w-full"
              ></button>
            </div>
            <div class="flex w-1/2 flex-col justify-center gap-1 p-2">
              <button
                (click)="merge()"
                [disabled]="files().length < 1 || isProcessing()"
                class="bg-primary w-full rounded py-1.5 text-[10px] font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {{ t.map()['BTN_MERGE'] }}
              </button>
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
                <span class="material-symbols-outlined text-sm">join_full</span>
                <span class="text-xs font-bold uppercase">{{ t.map()['TITLE'] }}</span>
              </div>
              <div class="flex gap-1">
                <button
                  (click)="triggerUpload()"
                  class="hover:text-primary text-slate-400 transition-colors"
                  title="Add"
                >
                  <span class="material-symbols-outlined text-sm">add</span>
                </button>
                <button
                  (click)="reset()"
                  class="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  title="Reset"
                >
                  <span class="material-symbols-outlined text-sm">refresh</span>
                </button>
              </div>
            </div>

            <div class="flex-1 space-y-1 overflow-y-auto p-2">
              @if (files().length === 0) {
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
              } @else {
                @for (file of files(); track file.id; let i = $index) {
                  <div
                    class="group flex items-center gap-2 rounded bg-slate-100 p-1.5 text-xs dark:bg-slate-700/50"
                  >
                    <span class="w-4 font-mono text-slate-400">{{ i + 1 }}</span>
                    <span class="flex-1 truncate text-slate-700 dark:text-slate-200">{{
                      file.file.name
                    }}</span>
                    <button
                      (click)="removeFile(i)"
                      class="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                    >
                      <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                }
              }
            </div>

            @if (files().length > 0) {
              <div
                class="border-t border-slate-100 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  (click)="merge()"
                  [disabled]="isProcessing()"
                  class="bg-primary w-full rounded-lg py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90"
                >
                  {{ isProcessing() ? '...' : t.map()['BTN_MERGE'] }}
                </button>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- Hidden Input -->
    <input
      #fileInput
      type="file"
      accept="application/pdf"
      multiple
      class="hidden"
      (change)="handleFileSelect($event)"
    />

    <ng-template #mainContent>
      <div
        class="flex min-h-[400px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Controls -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div class="flex gap-3">
            <button
              (click)="triggerUpload()"
              class="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              <span class="material-symbols-outlined">add</span>
              {{ t.map()['ADD_FILES'] }}
            </button>
            @if (files().length > 0) {
              <button
                (click)="reset()"
                class="px-4 py-2 text-slate-500 transition-colors hover:text-red-500"
              >
                {{ t.map()['BTN_RESET'] }}
              </button>
            }
          </div>

          @if (files().length > 1) {
            <button
              (click)="merge()"
              [disabled]="isProcessing()"
              class="bg-primary flex items-center gap-2 rounded-lg px-6 py-2 font-bold text-white shadow-sm transition-colors hover:bg-blue-600"
            >
              @if (isProcessing()) {
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
                ></span>
              } @else {
                <span class="material-symbols-outlined">join_full</span>
              }
              {{ t.map()['BTN_MERGE'] }}
            </button>
          }
        </div>

        <!-- Drop Zone / List -->
        <div
          appFileDrop
          (fileDropped)="handleFileDrop($event)"
          class="relative min-h-[200px] flex-1 rounded-xl border-2 border-dashed transition-all"
          [class.border-slate-200]="files().length > 0"
          [class.dark:border-slate-700]="files().length > 0"
          [class.border-slate-300]="files().length === 0"
          [class.dark:border-slate-600]="files().length === 0"
        >
          @if (files().length === 0) {
            <div
              (click)="triggerUpload()"
              class="absolute inset-0 flex cursor-pointer flex-col items-center justify-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span class="material-symbols-outlined mb-4 text-4xl text-slate-300"
                >upload_file</span
              >
              <p class="text-slate-500">{{ t.map()['DROP_LABEL'] }}</p>
            </div>
          } @else {
            <div class="space-y-2 p-4">
              @for (file of files(); track file.id; let i = $index) {
                <div
                  class="group hover:border-primary/50 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800"
                >
                  <div class="flex w-8 flex-col items-center justify-center gap-1">
                    @if (i > 0) {
                      <button (click)="move(i, -1)" class="hover:text-primary text-slate-300">
                        <span class="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                      </button>
                    }
                    @if (i < files().length - 1) {
                      <button (click)="move(i, 1)" class="hover:text-primary text-slate-300">
                        <span class="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                      </button>
                    }
                  </div>

                  <div
                    class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg"
                  >
                    <span class="material-symbols-outlined">picture_as_pdf</span>
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="truncate font-bold text-slate-900 dark:text-white">
                      {{ file.file.name }}
                    </div>
                    <div class="text-xs text-slate-500">{{ formatBytes(file.file.size) }}</div>
                  </div>

                  <button
                    (click)="removeFile(i)"
                    class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-red-500 dark:hover:bg-slate-700"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Result -->
        @if (resultUrl()) {
          <div class="mt-8">
            <app-action-bar
              [content]="resultBytes() || ''"
              filename="merged.pdf"
              mimeType="application/pdf"
              source="Merge PDF"
            ></app-action-bar>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class MergePdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  files = signal<PdfFile[]>([]);
  isProcessing = signal(false);

  resultUrl = signal<string | null>(null);
  resultBytes = signal<Uint8Array | null>(null);

  viewMode = computed(() => {
    const config = this.widgetConfig();
    // 1x1 -> compact
    if (config?.cols === 1 && config?.rows === 1) return 'compact';
    // 2x1 -> wide
    if (config?.cols === 2 && config?.rows === 1) return 'wide';
    // Default
    return 'default';
  });

  triggerUpload() {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files) this.addFiles(files);
    input.value = '';
  }

  handleFileDrop(files: FileList) {
    this.addFiles(files);
  }

  addFiles(list: FileList) {
    const newFiles: PdfFile[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        newFiles.push({ id: crypto.randomUUID(), file });
      }
    }

    if (newFiles.length === 0) {
      this.toast.show(this.t.get('ERR_INVALID'), 'error');
      return;
    }

    this.files.update((current) => [...current, ...newFiles]);
    this.resultUrl.set(null);
  }

  removeFile(index: number) {
    this.files.update((current) => current.filter((_, i) => i !== index));
    this.resultUrl.set(null);
  }

  move(index: number, delta: number) {
    this.files.update((current) => {
      const newArr = [...current];
      const item = newArr[index];
      newArr.splice(index, 1);
      newArr.splice(index + delta, 0, item);
      return newArr;
    });
    this.resultUrl.set(null);
  }

  reset() {
    this.files.set([]);
    this.resultUrl.set(null);
    this.resultBytes.set(null);
  }

  async merge() {
    if (this.files().length < 2 && !this.isWidget()) {
      // Just passthrough single file in widget mode
    }

    this.isProcessing.set(true);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const mergedPdf = await PDFDocument.create();

      for (const pdf of this.files()) {
        const buffer = await pdf.file.arrayBuffer();
        const doc = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const bytes = await mergedPdf.save();
      this.resultBytes.set(bytes);
      const safeBytes = new Uint8Array(bytes);
      const blob = new Blob([safeBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      this.resultUrl.set(url);

      if (this.isWidget()) {
        this.downloadResult();
      } else {
        this.toast.show(this.t.get('SUCCESS'), 'success');
      }
    } catch (e) {
      console.error(e);
      this.toast.show('Merge failed', 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult() {
    const url = this.resultUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged-document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
