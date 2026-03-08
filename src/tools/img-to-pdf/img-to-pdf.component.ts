import { Component, inject, signal, input, ElementRef, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { convertImagesToPdf, type PageSizeMode } from './img-to-pdf.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-img-to-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent, FileDropDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="img-to-pdf">
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
          <div class="relative flex flex-1 flex-col items-center justify-center p-1 text-center">
            @if (images().length > 0) {
              <div class="mb-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                {{ images().length }} {{ t.map()['IMAGES_SHORT'] }}
              </div>
              <button
                (click)="convert()"
                [disabled]="isProcessing()"
                class="bg-primary w-full rounded py-1 text-[9px] font-bold text-white"
              >
                {{ isProcessing() ? '...' : 'PDF' }}
              </button>
              <button
                (click)="reset()"
                class="hover:text-primary absolute top-0 right-0 rounded-full bg-white/80 p-0.5 text-slate-400 dark:bg-slate-800/80"
              >
                <span class="material-symbols-outlined text-[10px]">close</span>
              </button>
            } @else {
              <div
                (click)="triggerUpload()"
                class="hover:text-primary flex h-full w-full cursor-pointer flex-col items-center justify-center p-1 text-slate-400 transition-colors"
              >
                <span class="material-symbols-outlined mb-1 text-2xl">image</span>
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
            @if (images().length > 0) {
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
              class="flex w-1/2 flex-col items-center justify-center border-r border-slate-100 bg-slate-50 p-2 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-800"
            >
              <div
                (click)="triggerUpload()"
                class="group flex h-full w-full cursor-pointer flex-col items-center justify-center text-center"
              >
                <span
                  class="material-symbols-outlined group-hover:text-primary mb-1 text-xl text-slate-400 transition-colors"
                  >add_photo_alternate</span
                >
                <div class="text-[9px] leading-tight font-bold text-slate-500">
                  {{ images().length }} {{ t.map()['IMAGES'] }}
                </div>
              </div>
            </div>
            <div class="flex w-1/2 flex-col justify-center gap-1 p-2">
              <button
                (click)="convert()"
                [disabled]="images().length < 1 || isProcessing()"
                class="bg-primary w-full rounded py-1.5 text-[10px] font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {{ t.map()['BTN_CONVERT_SHORT'] }}
              </button>
            </div>
          </div>
        }
        <!-- Standard / Large -->
        @else {
          <div
            class="bg-primary/5 flex items-center justify-between border-b border-slate-100 p-2 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <span class="text-primary px-1 text-xs font-bold uppercase">{{
              t.map()['TITLE']
            }}</span>
            <div class="flex gap-1">
              <button
                (click)="triggerUpload()"
                class="hover:text-primary text-slate-400"
                title="Add"
              >
                <span class="material-symbols-outlined text-sm">add</span>
              </button>
              <button (click)="reset()" class="text-slate-400 hover:text-slate-600" title="Reset">
                <span class="material-symbols-outlined text-sm">refresh</span>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-2">
            @if (images().length === 0) {
              <div
                (click)="triggerUpload()"
                class="group flex h-full min-h-[60px] cursor-pointer flex-col items-center justify-center p-4 text-center text-slate-400"
              >
                <span
                  class="material-symbols-outlined group-hover:text-primary mb-2 text-2xl transition-transform group-hover:scale-110"
                  >add_photo_alternate</span
                >
                <span class="text-[10px] font-bold uppercase">{{ t.map()['DROP_EXPLICIT'] }}</span>
              </div>
            } @else {
              <div class="grid grid-cols-3 gap-1">
                @for (img of images(); track img.id) {
                  <div
                    class="group relative aspect-square overflow-hidden rounded bg-slate-100 dark:bg-slate-700"
                  >
                    <img [src]="img.previewUrl" class="h-full w-full object-cover" />
                    <button
                      (click)="removeImage(img.id)"
                      class="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                }
                <button
                  (click)="triggerUpload()"
                  class="hover:text-primary hover:border-primary flex aspect-square items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors dark:border-slate-600 dark:bg-slate-800"
                >
                  <span class="material-symbols-outlined">add</span>
                </button>
              </div>
            }
          </div>

          @if (images().length > 0) {
            <div class="border-t border-slate-100 p-2 dark:border-slate-700">
              <button
                (click)="convert()"
                [disabled]="isProcessing()"
                class="bg-primary w-full rounded-lg py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90"
              >
                {{ isProcessing() ? '...' : t.map()['BTN_CONVERT'] }}
              </button>
            </div>
          }
        }
      </div>
    }

    <input
      #fileInput
      type="file"
      accept="image/png, image/jpeg, image/webp"
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
          <div class="flex items-center gap-4">
            <button
              (click)="triggerUpload()"
              class="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              <span class="material-symbols-outlined">add_photo_alternate</span>
              {{ t.map()['ADD_IMAGES'] }}
            </button>

            <div class="flex items-center gap-2">
              <label class="text-sm font-bold text-slate-500">{{ t.map()['PAGE_SIZE'] }}</label>
              <select
                [(ngModel)]="pageSize"
                class="focus:ring-primary rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-sm text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="fit">{{ t.map()['SIZE_FIT'] }}</option>
                <option value="a4">{{ t.map()['SIZE_A4'] }}</option>
                <option value="letter">{{ t.map()['SIZE_LETTER'] }}</option>
              </select>
            </div>
          </div>

          @if (images().length > 0) {
            <div class="flex gap-2">
              <button
                (click)="reset()"
                class="px-4 py-2 text-slate-500 transition-colors hover:text-red-500"
              >
                {{ t.map()['BTN_RESET'] }}
              </button>
              <button
                (click)="convert()"
                [disabled]="isProcessing()"
                class="bg-primary flex items-center gap-2 rounded-lg px-6 py-2 font-bold text-white shadow-sm transition-colors hover:opacity-90"
              >
                @if (isProcessing()) {
                  <span
                    class="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
                  ></span>
                } @else {
                  <span class="material-symbols-outlined">picture_as_pdf</span>
                }
                {{ t.map()['BTN_CONVERT'] }}
              </button>
            </div>
          }
        </div>

        <!-- Drop Zone / Grid -->
        <div
          appFileDrop
          (fileDropped)="handleFileDrop($event)"
          class="relative min-h-[300px] flex-1 rounded-xl border-2 border-dashed p-4 transition-all"
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
              <span class="material-symbols-outlined mb-4 text-5xl text-slate-300">image</span>
              <p class="text-slate-500">{{ t.map()['DROP_LABEL'] }}</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              @for (img of images(); track img.id; let i = $index) {
                <div
                  class="group relative aspect-[3/4] cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm active:cursor-grabbing dark:border-slate-600 dark:bg-slate-700"
                >
                  <img [src]="img.previewUrl" class="h-full w-full object-cover" />
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <button
                      (click)="removeImage(img.id)"
                      class="rounded-full bg-red-500 p-2 text-white shadow-lg hover:bg-red-600"
                    >
                      <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                    <div class="flex gap-1">
                      <button
                        (click)="move(i, -1)"
                        *ngIf="i > 0"
                        class="rounded bg-white/20 p-1 text-white hover:bg-white/40"
                      >
                        <span class="material-symbols-outlined">arrow_back</span>
                      </button>
                      <button
                        (click)="move(i, 1)"
                        *ngIf="i < images().length - 1"
                        class="rounded bg-white/20 p-1 text-white hover:bg-white/40"
                      >
                        <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                  <span
                    class="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    >{{ i + 1 }}</span
                  >
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
              filename="images.pdf"
              mimeType="application/pdf"
              source="Images to PDF"
            ></app-action-bar>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class ImgToPdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  images = signal<ImageFile[]>([]);
  pageSize = signal<PageSizeMode>('a4');
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
    const newImgs: ImageFile[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newImgs.push({ id: crypto.randomUUID(), file, previewUrl: url });
      }
    }

    if (newImgs.length === 0) {
      this.toast.show(this.t.get('ERR_INVALID'), 'error');
      return;
    }

    this.images.update((current) => [...current, ...newImgs]);
    this.resultUrl.set(null);
  }

  removeImage(id: string) {
    const img = this.images().find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.previewUrl); // Cleanup

    this.images.update((current) => current.filter((i) => i.id !== id));
    this.resultUrl.set(null);
  }

  move(index: number, delta: number) {
    this.images.update((current) => {
      const newArr = [...current];
      const item = newArr[index];
      newArr.splice(index, 1);
      newArr.splice(index + delta, 0, item);
      return newArr;
    });
    this.resultUrl.set(null);
  }

  reset() {
    this.images().forEach((i) => URL.revokeObjectURL(i.previewUrl));
    this.images.set([]);
    this.resultUrl.set(null);
    this.resultBytes.set(null);
  }

  async convert() {
    if (this.images().length === 0) return;

    this.isProcessing.set(true);

    try {
      const imageInputs = await Promise.all(
        this.images().map(async (img) => ({
          buffer: await img.file.arrayBuffer(),
          mimeType: img.file.type,
          name: img.file.name,
        })),
      );

      const result = await convertImagesToPdf(imageInputs, this.pageSize());

      if (!result.success || !result.pdfBytes) {
        this.toast.show(result.error ?? 'Conversion failed', 'error');
        return;
      }

      this.resultBytes.set(result.pdfBytes);
      const safeBuffer = new ArrayBuffer(result.pdfBytes.byteLength);
      const safeBytes = new Uint8Array(safeBuffer);
      safeBytes.set(result.pdfBytes);
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
      this.toast.show('Conversion failed', 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult() {
    const url = this.resultUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-images.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
