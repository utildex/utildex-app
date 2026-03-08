import { Component, inject, signal, computed, input, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { formatBytes as formatKernelBytes, processImageBlob } from './image-converter.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type ImageStatus = 'pending' | 'converting' | 'done' | 'error';

interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
  status: ImageStatus;
  resultBlob?: Blob;
  resultUrl?: string;
  resultSize?: number;
}

@Component({
  selector: 'app-image-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, FileDropDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="image-converter">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        appFileDrop
        (fileDropped)="handleFileDrop($event)"
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- 1x1 -->
        @if (viewMode() === 'compact') {
          <div
            class="flex h-6 items-center justify-center border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <span class="truncate px-1 text-[9px] font-bold text-slate-500 uppercase">{{
              t.map()['TITLE_SHORT']
            }}</span>
          </div>
          <div class="relative flex flex-1 flex-col items-center justify-center p-1 text-center">
            @if (isDone()) {
              <button
                (click)="downloadZip()"
                class="flex h-full w-full flex-col items-center justify-center bg-green-50 text-green-600 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
              >
                <span class="material-symbols-outlined text-xl">download</span>
                <span class="text-[9px] font-bold uppercase">ZIP</span>
              </button>
              <button
                (click)="reset()"
                class="absolute top-0 right-0 z-10 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <span class="material-symbols-outlined text-[10px]">close</span>
              </button>
            } @else if (images().length > 0) {
              <div class="mb-1 text-[10px] font-bold">
                {{ images().length }} {{ t.map()['FILES'] }}
              </div>
              <button
                (click)="convertAll()"
                [disabled]="isProcessing()"
                class="bg-primary w-full rounded py-1 text-[9px] font-bold text-white"
              >
                {{ isProcessing() ? '...' : t.map()['BTN_CONVERT_SHORT'] }}
              </button>
            } @else {
              <div
                (click)="triggerUpload()"
                class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
              >
                <span class="material-symbols-outlined text-2xl text-slate-400">photo_library</span>
              </div>
            }
          </div>
        }
        <!-- Standard -->
        @else {
          <div
            class="bg-primary/5 flex items-center justify-between border-b border-slate-100 p-2 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <span class="text-primary px-1 text-xs font-bold uppercase">{{
              t.map()['TITLE']
            }}</span>
            <button
              (click)="reset()"
              *ngIf="images().length"
              class="hover:text-primary text-slate-400"
            >
              <span class="material-symbols-outlined text-sm">refresh</span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-2">
            @if (images().length === 0) {
              <div
                (click)="triggerUpload()"
                class="group flex h-full cursor-pointer flex-col items-center justify-center p-4 text-slate-400"
              >
                <span
                  class="material-symbols-outlined group-hover:text-primary mb-2 text-3xl transition-transform group-hover:scale-110"
                  >add_photo_alternate</span
                >
                <span class="text-[10px] font-bold uppercase">{{ t.map()['DROP_EXPLICIT'] }}</span>
              </div>
            } @else {
              <div class="grid grid-cols-3 gap-1">
                @for (img of images(); track img.id) {
                  <div
                    class="relative aspect-square overflow-hidden rounded bg-slate-100 dark:bg-slate-700"
                  >
                    <img [src]="img.previewUrl" class="h-full w-full object-cover" />
                    @if (img.status === 'done') {
                      <div
                        class="absolute inset-0 flex items-center justify-center bg-green-500/50 text-white"
                      >
                        <span class="material-symbols-outlined text-sm">check</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          @if (images().length > 0) {
            <div class="grid grid-cols-2 gap-1 border-t border-slate-100 p-2 dark:border-slate-700">
              <select
                [(ngModel)]="targetFormat"
                class="rounded border bg-slate-50 text-[10px] dark:bg-slate-900 dark:text-white"
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
              @if (isDone()) {
                <button
                  (click)="downloadZip()"
                  class="rounded bg-green-600 text-[10px] font-bold text-white hover:bg-green-700"
                >
                  ZIP
                </button>
              } @else {
                <button
                  (click)="convertAll()"
                  [disabled]="isProcessing()"
                  class="bg-primary rounded text-[10px] font-bold text-white hover:opacity-90"
                >
                  {{ isProcessing() ? '...' : t.map()['BTN_CONVERT'] }}
                </button>
              }
            </div>
          }
        }
      </div>
    }

    <input
      #fileInput
      type="file"
      accept="image/*,.heic"
      multiple
      class="hidden"
      (change)="handleFileSelect($event)"
    />

    <ng-template #mainContent>
      <div
        class="flex min-h-[500px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Toolbar -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button
              (click)="triggerUpload()"
              class="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              <span class="material-symbols-outlined">add_photo_alternate</span>
              {{ t.map()['BTN_ADD'] }}
            </button>

            @if (images().length > 0) {
              <div class="h-8 w-px bg-slate-200 dark:bg-slate-600"></div>

              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500 uppercase">{{
                  t.map()['FMT_LABEL']
                }}</span>
                <select
                  [(ngModel)]="targetFormat"
                  class="focus:ring-primary rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-sm text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </div>

              @if (targetFormat() !== 'image/png') {
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-slate-500 uppercase">{{
                    t.map()['QUAL_LABEL']
                  }}</span>
                  <input
                    type="range"
                    [(ngModel)]="quality"
                    min="0.1"
                    max="1"
                    step="0.1"
                    class="h-2 w-20 cursor-pointer appearance-none rounded-lg bg-slate-200"
                  />
                  <span class="w-8 font-mono text-xs">{{ (quality() * 100).toFixed(0) }}%</span>
                </div>
              }
            }
          </div>

          @if (images().length > 0) {
            <div class="flex gap-2">
              <button
                (click)="reset()"
                class="px-4 py-2 text-slate-500 transition-colors hover:text-red-500"
              >
                {{ t.map()['BTN_RESET'] }}
              </button>

              @if (isDone()) {
                <button
                  (click)="downloadZip()"
                  class="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-bold text-white shadow-sm transition-colors hover:bg-green-700"
                >
                  <span class="material-symbols-outlined">archive</span>
                  {{ t.map()['BTN_DOWNLOAD_ZIP'] }}
                </button>
              } @else {
                <button
                  (click)="convertAll()"
                  [disabled]="isProcessing()"
                  class="bg-primary flex items-center gap-2 rounded-lg px-6 py-2 font-bold text-white shadow-sm transition-colors hover:opacity-90"
                >
                  @if (isProcessing()) {
                    <span
                      class="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
                    ></span>
                  } @else {
                    <span class="material-symbols-outlined">transform</span>
                  }
                  {{ t.map()['BTN_CONVERT'] }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Grid -->
        <div
          appFileDrop
          (fileDropped)="handleFileDrop($event)"
          class="relative min-h-[300px] flex-1 rounded-xl border-2 border-dashed bg-slate-50/50 p-4 transition-all dark:bg-slate-900/20"
          [class.border-slate-200]="images().length > 0"
          [class.dark:border-slate-700]="images().length > 0"
          [class.border-slate-300]="images().length === 0"
          [class.dark:border-slate-600]="images().length === 0"
        >
          @if (images().length === 0) {
            <div
              (click)="triggerUpload()"
              class="absolute inset-0 flex cursor-pointer flex-col items-center justify-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span class="material-symbols-outlined mb-4 text-6xl text-slate-300"
                >photo_library</span
              >
              <p class="font-medium text-slate-500">{{ t.map()['DROP_LABEL'] }}</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              @for (img of images(); track img.id) {
                <div
                  class="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div
                    class="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700"
                  >
                    <img [src]="img.previewUrl" class="h-full w-full object-cover" />

                    <!-- Overlay Status -->
                    <div
                      class="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity"
                      [class.opacity-0]="img.status === 'pending' && !isProcessing()"
                      [class.group-hover:opacity-100]="img.status === 'pending'"
                    >
                      @if (img.status === 'pending') {
                        <button
                          (click)="removeImage(img.id)"
                          class="scale-0 transform rounded-full bg-red-500 p-2 text-white shadow-lg transition-transform group-hover:scale-100 hover:bg-red-600"
                        >
                          <span class="material-symbols-outlined">delete</span>
                        </button>
                      } @else if (img.status === 'converting') {
                        <span
                          class="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"
                        ></span>
                      } @else if (img.status === 'done') {
                        <div class="flex flex-col items-center">
                          <span
                            class="material-symbols-outlined mb-2 text-4xl text-green-400 drop-shadow-md"
                            >check_circle</span
                          >
                          <button
                            (click)="downloadSingle(img)"
                            class="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900 hover:bg-slate-100"
                          >
                            Download
                          </button>
                        </div>
                      } @else if (img.status === 'error') {
                        <span class="material-symbols-outlined text-4xl text-red-500">error</span>
                      }
                    </div>
                  </div>

                  <div class="border-t border-slate-100 p-2 text-center dark:border-slate-700">
                    <div class="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      {{ img.file.name }}
                    </div>
                    <div class="flex justify-between px-1 text-[10px] text-slate-500">
                      <span>{{ formatBytes(img.file.size) }}</span>
                      @if (img.resultSize) {
                        <span class="font-bold text-green-600">{{
                          formatBytes(img.resultSize)
                        }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class ImageConverterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  images = signal<QueuedImage[]>([]);
  targetFormat = signal<string>('image/jpeg');
  quality = signal<number>(0.8);
  isProcessing = signal(false);

  isDone = computed(
    () =>
      this.images().length > 0 &&
      this.images().every((i) => i.status === 'done' || i.status === 'error'),
  );

  viewMode = computed(() => {
    const config = this.widgetConfig();
    // 1x1 -> compact
    if (config?.cols === 1 && config?.rows === 1) return 'compact';
    // Default
    return 'default';
  });

  triggerUpload() {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(input.files);
    input.value = '';
  }

  handleFileDrop(files: FileList) {
    this.addFiles(files);
  }

  addFiles(list: FileList) {
    const newImgs: QueuedImage[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      // Basic support check
      if (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')) {
        newImgs.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
        });
      }
    }

    if (newImgs.length > 0) {
      this.images.update((curr) => [...curr, ...newImgs]);
    }
  }

  removeImage(id: string) {
    const img = this.images().find((i) => i.id === id);
    if (img) {
      URL.revokeObjectURL(img.previewUrl);
      if (img.resultUrl) URL.revokeObjectURL(img.resultUrl);
    }
    this.images.update((curr) => curr.filter((i) => i.id !== id));
  }

  reset() {
    this.images().forEach((i) => {
      URL.revokeObjectURL(i.previewUrl);
      if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
    });
    this.images.set([]);
    this.isProcessing.set(false);
  }

  async convertAll() {
    if (this.isProcessing() || this.images().length === 0) return;

    this.isProcessing.set(true);
    const format = this.targetFormat();
    const qual = this.quality();

    // Load libraries lazily
    // Note: We use dynamic import for heic2any only if needed
    let heicLib: ((options: { blob: Blob; toType: string }) => Promise<Blob | Blob[]>) | null =
      null;
    const needsHeic = this.images().some((i) => i.file.name.toLowerCase().endsWith('.heic'));

    if (needsHeic) {
      try {
        const module = await import('heic2any');
        heicLib = module.default;
      } catch (e) {
        console.error('Failed to load heic2any', e);
        this.toast.show(this.t.get('ERR_HEIC'), 'error');
        this.isProcessing.set(false);
        return;
      }
    }

    // Process sequentially to avoid freezing UI too much
    const queue = this.images();

    for (const img of queue) {
      if (img.status === 'done') continue;

      this.updateStatus(img.id, 'converting');

      try {
        let sourceBlob: Blob = img.file;

        // Handle HEIC
        if (img.file.name.toLowerCase().endsWith('.heic')) {
          if (!heicLib) throw new Error('HEIC lib not loaded');
          const convertedBlob = await heicLib({ blob: img.file, toType: 'image/jpeg' });
          // heic2any can return Blob or Blob[], handle both
          sourceBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        }

        // Convert via Canvas
        const resultBlob = await processImageBlob(sourceBlob, format, qual);
        const resultUrl = URL.createObjectURL(resultBlob);

        this.images.update((curr) =>
          curr.map((i) =>
            i.id === img.id
              ? { ...i, status: 'done', resultBlob, resultUrl, resultSize: resultBlob.size }
              : i,
          ),
        );
      } catch (e) {
        console.error(e);
        this.updateStatus(img.id, 'error');
      }
    }

    this.isProcessing.set(false);
    this.toast.show(this.t.get('SUCCESS_MSG'), 'success');
  }

  updateStatus(id: string, status: ImageStatus) {
    this.images.update((curr) => curr.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  async downloadZip() {
    const files = this.images().filter((i) => i.status === 'done' && i.resultBlob);
    if (files.length === 0) return;

    try {
      const module = await import('jszip');
      const JSZip = module.default;
      const zip = new JSZip();

      const ext = this.targetFormat().split('/')[1];

      files.forEach((img, idx) => {
        const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${idx}`;
        if (img.resultBlob) {
          zip.file(`${name}.${ext}`, img.resultBlob);
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted-images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      this.toast.show('Failed to create ZIP', 'error');
    }
  }

  downloadSingle(img: QueuedImage) {
    if (!img.resultUrl) return;
    const ext = this.targetFormat().split('/')[1];
    const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || 'image';

    const a = document.createElement('a');
    a.href = img.resultUrl;
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  formatBytes(bytes: number): string {
    return formatKernelBytes(bytes);
  }
}
