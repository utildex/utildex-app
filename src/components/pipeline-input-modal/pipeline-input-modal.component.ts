import {
  Component,
  input,
  output,
  signal,
  inject,
  ElementRef,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ScopedTranslationService } from '../../core/i18n';

/**
 * Modal overlay for configuring pipeline input nodes.
 * Inherits ScopedTranslationService from the parent pipeline page.
 */
@Component({
  selector: 'app-pipeline-input-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="close.emit()" (keydown.escape)="close.emit()">
      <div class="modal-body glass-panel" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="flex items-center gap-2.5">
            <span class="material-symbols-outlined text-lg" [style.color]="color()">{{
              icon()
            }}</span>
            <h3 class="text-base font-bold text-slate-800 dark:text-white">{{ title() }}</h3>
          </div>
          <button class="modal-close" (click)="close.emit()">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Text mode -->
        @if (mode() === 'text') {
          <div class="p-4">
            <label class="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {{ t.map()['MODAL_TEXT_LABEL'] }}
            </label>
            <textarea
              #textArea
              class="h-40 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 transition-colors outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400"
              [value]="initialText()"
              [placeholder]="t.map()['MODAL_TEXT_PLACEHOLDER']"
            ></textarea>
          </div>
        }

        <!-- File mode -->
        @if (mode() === 'file') {
          <div class="p-4">
            <label class="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {{ t.map()['MODAL_FILE_LABEL'] }}
            </label>
            <div
              class="drop-zone"
              [class.drop-active]="isDragOver()"
              (dragover)="onDragOver($event)"
              (dragleave)="isDragOver.set(false)"
              (drop)="onDrop($event)"
              (click)="fileInput.click()"
            >
              <input #fileInput type="file" multiple class="hidden" (change)="onFilePick($event)" />

              @if (files().length === 0) {
                <span
                  class="material-symbols-outlined mb-2 text-3xl text-slate-300 dark:text-slate-600"
                  >cloud_upload</span
                >
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  {{ t.map()['MODAL_FILE_DROP'] }}
                  <span class="font-medium text-blue-500">{{ t.map()['MODAL_FILE_BROWSE'] }}</span>
                </p>
              } @else {
                <div class="flex w-full flex-col gap-1.5">
                  @for (f of files(); track $index) {
                    <div
                      class="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800"
                    >
                      <span class="material-symbols-outlined text-sm text-slate-400"
                        >description</span
                      >
                      <span class="flex-1 truncate text-slate-700 dark:text-slate-300">{{
                        f.name
                      }}</span>
                      <span class="text-xs text-slate-400">{{ formatSize(f.size) }}</span>
                      <button
                        (click)="removeFile($index); $event.stopPropagation()"
                        class="text-slate-400 hover:text-red-500"
                      >
                        <span class="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  }
                  <p class="mt-1 text-center text-xs text-slate-400">
                    {{ t.map()['MODAL_FILE_MORE'] }}
                  </p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Footer -->
        <div
          class="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700"
        >
          <button
            (click)="close.emit()"
            class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {{ t.map()['MODAL_CANCEL'] }}
          </button>
          <button
            (click)="onSave()"
            class="bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
          >
            {{ t.map()['MODAL_SAVE'] }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        animation: fadeIn 0.15s ease-out;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
      }

      .modal-body {
        width: 100%;
        max-width: 460px;
        border-radius: 16px;
        overflow: hidden;
        animation: slideUp 0.2s ease-out;
      }
      @keyframes slideUp {
        from {
          transform: translateY(12px);
          opacity: 0;
        }
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }
      :host-context(.dark) .modal-header {
        border-bottom-color: rgba(255, 255, 255, 0.06);
      }

      .modal-close {
        padding: 4px;
        border-radius: 8px;
        color: #94a3b8;
        transition: all 0.15s;
      }
      .modal-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #475569;
      }
      :host-context(.dark) .modal-close:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #e2e8f0;
      }

      .drop-zone {
        min-height: 140px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 2px dashed rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .drop-zone:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.04);
      }
      .drop-zone.drop-active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.08);
      }
      :host-context(.dark) .drop-zone {
        border-color: rgba(255, 255, 255, 0.08);
      }
      :host-context(.dark) .drop-zone:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.08);
      }
    `,
  ],
})
export class PipelineInputModalComponent {
  /* Inherits translation scope from parent pipeline page */
  readonly t = inject(ScopedTranslationService);

  mode = input.required<'text' | 'file'>();
  title = input<string>('Configure Input');
  icon = input<string>('edit');
  color = input<string>('#3b82f6');
  initialText = input<string>('');
  initialFiles = input<File[]>([]);

  close = output<void>();
  saveText = output<string>();
  saveFiles = output<File[]>();

  readonly textArea = viewChild<ElementRef<HTMLTextAreaElement>>('textArea');
  files = signal<File[]>([]);
  isDragOver = signal(false);

  ngOnInit() {
    if (this.initialFiles().length) {
      this.files.set([...this.initialFiles()]);
    }
  }

  onSave() {
    if (this.mode() === 'text') {
      this.saveText.emit(this.textArea()?.nativeElement.value ?? '');
    } else {
      this.saveFiles.emit(this.files());
    }
    this.close.emit();
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(true);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
    if (e.dataTransfer?.files) this.addFiles(e.dataTransfer.files);
  }

  onFilePick(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.files) {
      this.addFiles(el.files);
      el.value = '';
    }
  }

  removeFile(idx: number) {
    this.files.update((f) => f.filter((_, i) => i !== idx));
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  private addFiles(list: FileList) {
    this.files.update((ex) => [...ex, ...Array.from(list)]);
  }
}
