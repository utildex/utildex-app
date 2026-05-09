import { Component, inject, signal, input, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { rotatePdfBytes, type RotationMode } from './rotate-pdf.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-rotate-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent, FileDropDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="rotate-pdf">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        appFileDrop
        (fileDropped)="handleFileDrop($event)"
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <div
          class="bg-primary/5 flex items-center justify-between border-b border-slate-100 p-2 dark:border-slate-700 dark:bg-slate-900/50"
        >
          <span class="text-primary px-1 text-xs font-bold uppercase">Rotate</span>
          @if (pdfFile()) {
            <button (click)="reset()" class="hover:text-primary text-slate-400">
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          }
        </div>

        <div class="relative flex flex-1 flex-col items-center justify-center p-2">
          @if (pdfFile()) {
            <span
              class="material-symbols-outlined text-primary mb-1 text-4xl transition-transform duration-300"
              [style.transform]="'rotate(' + totalRotation() + 'deg)'"
              >picture_as_pdf</span
            >
            <div
              class="w-full truncate text-center text-[10px] font-bold text-slate-700 dark:text-slate-200"
            >
              {{ pdfFile()?.name }}
            </div>

            <div class="mt-2 flex gap-2">
              <button
                (click)="addRotation(-90)"
                class="rounded bg-slate-100 p-1 hover:bg-slate-200 dark:bg-slate-700"
              >
                <span class="material-symbols-outlined text-sm">rotate_left</span>
              </button>
              <button
                (click)="addRotation(90)"
                class="rounded bg-slate-100 p-1 hover:bg-slate-200 dark:bg-slate-700"
              >
                <span class="material-symbols-outlined text-sm">rotate_right</span>
              </button>
            </div>
          } @else {
            <button
              (click)="triggerUpload()"
              class="hover:text-primary flex h-full w-full flex-col items-center justify-center text-slate-400 transition-colors"
            >
              <span class="material-symbols-outlined mb-1 text-3xl">rotate_right</span>
              <span class="text-[9px] font-bold uppercase">{{ t.map()['UPLOAD_PDF'] }}</span>
            </button>
          }
        </div>

        @if (pdfFile()) {
          <div class="border-t border-slate-100 p-2 dark:border-slate-700">
            <button
              (click)="save()"
              [disabled]="isProcessing()"
              class="bg-primary w-full rounded py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90"
            >
              {{ isProcessing() ? '...' : 'Save' }}
            </button>
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
        @if (!pdfFile()) {
          <div
            appFileDrop
            (fileDropped)="handleFileDrop($event)"
            (click)="triggerUpload()"
            class="hover:border-primary group flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-12 transition-all hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800/50"
          >
            <span
              class="material-symbols-outlined mb-4 text-5xl text-slate-300 transition-transform group-hover:scale-110"
              >rotate_right</span
            >
            <h3 class="mb-2 text-xl font-bold text-slate-700 dark:text-slate-200">
              {{ t.map()['DROP_LABEL'] }}
            </h3>
          </div>
        } @else {
          <div class="flex flex-1 flex-col items-center justify-center">
            <div
              class="mb-8 flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/50"
            >
              <div
                class="flex h-32 w-24 items-center justify-center border border-slate-200 bg-white shadow-md transition-transform duration-500 dark:border-slate-700 dark:bg-slate-800"
                [style.transform]="'rotate(' + totalRotation() + 'deg)'"
              >
                <span class="material-symbols-outlined text-primary text-4xl">picture_as_pdf</span>
              </div>
              <div class="text-center">
                <div class="font-bold text-slate-900 dark:text-white">{{ pdfFile()?.name }}</div>
                <div class="text-sm text-slate-500">{{ totalRotation() }}°</div>
              </div>

              <!-- Configuration -->
              <div class="w-full space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                <div class="flex flex-col gap-2">
                  <label class="text-xs font-bold text-slate-500 uppercase">{{
                    t.map()['LABEL_MODE']
                  }}</label>
                  <select
                    [(ngModel)]="mode"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  >
                    <option value="all">{{ t.map()['MODE_ALL'] }}</option>
                    <option value="odd">{{ t.map()['MODE_ODD'] }}</option>
                    <option value="even">{{ t.map()['MODE_EVEN'] }}</option>
                    <option value="specific">{{ t.map()['MODE_SPECIFIC'] }}</option>
                  </select>
                </div>

                @if (mode() === 'specific') {
                  <div class="animate-fade-in">
                    <input
                      type="text"
                      [(ngModel)]="specificRange"
                      class="focus:ring-primary w-full rounded-lg border border-slate-300 bg-white p-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
                      [placeholder]="t.map()['PLACEHOLDER_RANGE']"
                    />
                  </div>
                }
              </div>
            </div>

            <div class="mb-8 flex gap-4">
              <button
                (click)="addRotation(-90)"
                class="flex w-24 flex-col items-center gap-2 rounded-xl bg-slate-100 p-4 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <span class="material-symbols-outlined text-3xl">rotate_left</span>
                <span class="text-xs font-bold">{{ t.map()['BTN_ROTATE_LEFT'] }}</span>
              </button>
              <button
                (click)="addRotation(180)"
                class="flex w-24 flex-col items-center gap-2 rounded-xl bg-slate-100 p-4 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <span class="material-symbols-outlined text-3xl">sync</span>
                <span class="text-xs font-bold">{{ t.map()['BTN_ROTATE_180'] }}</span>
              </button>
              <button
                (click)="addRotation(90)"
                class="flex w-24 flex-col items-center gap-2 rounded-xl bg-slate-100 p-4 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <span class="material-symbols-outlined text-3xl">rotate_right</span>
                <span class="text-xs font-bold">{{ t.map()['BTN_ROTATE_RIGHT'] }}</span>
              </button>
            </div>

            <div class="flex gap-4">
              <button
                (click)="reset()"
                class="px-6 py-3 font-bold text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
              >
                {{ t.map()['BTN_RESET'] }}
              </button>
              <button
                (click)="save()"
                [disabled]="isProcessing()"
                class="bg-primary flex items-center gap-2 rounded-xl px-8 py-3 font-bold text-white shadow-lg transition-colors hover:opacity-90"
              >
                @if (isProcessing()) {
                  <span
                    class="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
                  ></span>
                }
                {{ t.map()['BTN_SAVE'] }}
              </button>
            </div>
          </div>
        }

        <!-- Result -->
        @if (resultUrl()) {
          <div class="mt-8">
            <app-action-bar
              [content]="resultBytes() || ''"
              filename="rotated.pdf"
              mimeType="application/pdf"
              source="Rotate PDF"
            ></app-action-bar>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class RotatePdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  pdfFile = signal<File | null>(null);

  // Rotation configuration
  totalRotation = signal(0);
  mode = signal<RotationMode>('all');
  specificRange = signal('');

  isProcessing = signal(false);

  resultUrl = signal<string | null>(null);
  resultBytes = signal<Uint8Array | null>(null);

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

  loadFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      this.toast.show('Invalid file', 'error');
      return;
    }
    this.pdfFile.set(file);
    this.totalRotation.set(0);
    this.mode.set('all');
    this.specificRange.set('');
    this.resultUrl.set(null);
  }

  addRotation(deg: number) {
    this.totalRotation.update((curr) => (curr + deg) % 360);
  }

  reset() {
    this.pdfFile.set(null);
    this.totalRotation.set(0);
    this.resultUrl.set(null);
    this.resultBytes.set(null);
  }

  async save() {
    const sourceFile = this.pdfFile();
    if (!sourceFile) return;
    this.isProcessing.set(true);

    try {
      const buffer = await sourceFile.arrayBuffer();
      const angle = this.totalRotation();
      const safeBytes = await rotatePdfBytes(buffer, angle, this.mode(), this.specificRange());
      this.resultBytes.set(safeBytes);

      const normalizedBytes = new Uint8Array(safeBytes.byteLength);
      normalizedBytes.set(safeBytes);
      const blob = new Blob([normalizedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      this.resultUrl.set(url);

      if (this.isWidget()) {
        this.downloadResult();
      } else {
        this.toast.show(this.t.get('SUCCESS'), 'success');
      }
    } catch (e) {
      console.error(e);
      this.toast.show('Error processing PDF', 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult() {
    const url = this.resultUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rotated-document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
