import {
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  input,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { formatJson, minifyJson, type IndentOption } from './json-formatter.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-json-formatter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent, FileDropDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="json-formatter">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div class="glass-surface relative flex h-full flex-col overflow-hidden rounded-xl">
        <div class="glass-subsection flex items-center justify-between border-b p-2">
          <span class="px-1 text-xs font-bold text-slate-500 uppercase">JSON Formatter</span>
          <div class="flex gap-1">
            <button
              (click)="openExpanded()"
              class="glass-control rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              title="Expand"
            >
              <span class="material-symbols-outlined text-sm">open_in_full</span>
            </button>
            <button
              (click)="minify()"
              class="glass-control rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              title="Minify"
            >
              <span class="material-symbols-outlined text-sm">compress</span>
            </button>
            <button
              (click)="format()"
              class="glass-control rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              title="Format"
            >
              <span class="material-symbols-outlined text-sm">data_object</span>
            </button>
          </div>
        </div>
        <div class="group relative flex-1 p-0">
          <textarea
            [(ngModel)]="content"
            [placeholder]="t.map()['INPUT_PLACEHOLDER']"
            class="h-full w-full resize-none bg-transparent p-2 font-mono text-xs text-slate-800 focus:outline-none dark:text-slate-200"
          ></textarea>
        </div>
      </div>
    }

    <ng-template #mainContent>
      <div
        class="glass-surface glass-surface-hover flex h-[min(72vh,44rem)] flex-col overflow-hidden rounded-2xl"
      >
        <!-- Toolbar -->
        <div
          class="glass-subsection flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3"
        >
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-slate-500 uppercase">{{
                t.map()['INDENT_LABEL']
              }}</label>
              <select
                [(ngModel)]="indentSize"
                (change)="format()"
                class="glass-control focus:ring-primary focus:border-primary rounded-lg border px-2 py-1 text-sm text-slate-700 focus:outline-none dark:text-slate-200"
              >
                <option [ngValue]="2">{{ t.map()['TAB_2'] }}</option>
                <option [ngValue]="4">{{ t.map()['TAB_4'] }}</option>
                <option value="tab">{{ t.map()['TAB_TAB'] }}</option>
              </select>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              (click)="clear()"
              class="px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-red-500 dark:text-slate-400"
            >
              {{ t.map()['BTN_CLEAR'] }}
            </button>
            <button
              (click)="minify()"
              class="glass-button rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {{ t.map()['BTN_MINIFY'] }}
            </button>
            <button
              (click)="format()"
              class="bg-primary rounded-lg px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600"
            >
              {{ t.map()['BTN_FORMAT'] }}
            </button>
            <button
              (click)="toggleExpanded()"
              class="glass-button rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
              [title]="isExpanded() ? 'Exit expanded view' : 'Expand editor'"
            >
              <span class="material-symbols-outlined align-middle text-base">
                {{ isExpanded() ? 'close_fullscreen' : 'open_in_full' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Editor Area -->
        <div class="group relative flex-1">
          <textarea
            appFileDrop
            (fileDropped)="handleFileDrop($event)"
            [(ngModel)]="content"
            (ngModelChange)="error.set(null)"
            [placeholder]="t.map()['INPUT_PLACEHOLDER']"
            class="h-full w-full resize-none overflow-auto bg-white p-6 font-mono text-sm text-slate-800 transition-colors focus:outline-none dark:bg-slate-900 dark:text-slate-200"
            [class.bg-red-50]="error()"
            [class.dark:bg-red-900/10]="error()"
          ></textarea>

          <!-- File Drop Overlay Hint -->
          <div
            class="bg-primary/10 border-primary pointer-events-none absolute inset-0 z-10 hidden items-center justify-center rounded-xl border-2 border-dashed group-[.drag-over]:flex"
          >
            <div
              class="text-primary rounded-full bg-white px-4 py-2 font-bold shadow-lg dark:bg-slate-800"
            >
              Drop JSON file here
            </div>
          </div>

          <!-- Error Message -->
          @if (error()) {
            <div
              class="animate-fade-in absolute right-4 bottom-4 left-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/80 dark:text-red-200"
            >
              <span class="material-symbols-outlined mt-0.5 text-xl">warning</span>
              <div>
                <strong class="block font-bold">{{ t.map()['ERROR_INVALID'] }}</strong>
                <span class="font-mono text-sm opacity-90">{{ error() }}</span>
              </div>
            </div>
          }
        </div>

        <!-- Status -->
        <div
          class="glass-subsection flex items-center justify-between border-t px-4 py-2 text-xs text-slate-500 dark:text-slate-400"
        >
          <span>{{ lineCount() }} lines • {{ charCount() }} chars</span>
          @if (content().trim()) {
            @if (error()) {
              <span class="text-red-500">Invalid JSON</span>
            } @else {
              <span class="text-emerald-600 dark:text-emerald-400">Valid JSON</span>
            }
          }
        </div>

        <!-- Actions -->
        @if (content() && !error()) {
          <app-action-bar
            [content]="content()"
            filename="data.json"
            mimeType="application/json"
            source="JSON Formatter"
          ></app-action-bar>
        }
      </div>
    </ng-template>

    <dialog
      #expandedDialog
      class="tool-modal-dialog"
      (close)="onExpandedDialogClose()"
      (click)="onExpandedDialogClick($event)"
    >
      <div
        class="tool-modal-panel glass-surface-strong flex h-[92vh] w-[min(96vw,1200px)] flex-col overflow-hidden rounded-2xl"
      >
        <div
          class="glass-subsection flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500 uppercase">Expanded JSON Editor</span>
            <span class="text-xs text-slate-400">Ctrl+Enter: Format, Ctrl+Shift+M: Minify</span>
          </div>
          <div class="flex items-center gap-2">
            <select
              [(ngModel)]="indentSize"
              class="glass-control focus:ring-primary focus:border-primary rounded-lg border px-2 py-1 text-sm text-slate-700 focus:outline-none dark:text-slate-200"
            >
              <option [ngValue]="2">{{ t.map()['TAB_2'] }}</option>
              <option [ngValue]="4">{{ t.map()['TAB_4'] }}</option>
              <option value="tab">{{ t.map()['TAB_TAB'] }}</option>
            </select>
            <button
              (click)="minify()"
              class="glass-button rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {{ t.map()['BTN_MINIFY'] }}
            </button>
            <button
              (click)="format()"
              class="bg-primary rounded-lg px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600"
            >
              {{ t.map()['BTN_FORMAT'] }}
            </button>
            <button
              (click)="closeExpanded()"
              class="glass-button rounded-lg border p-1.5 text-slate-600 dark:text-slate-200"
              title="Close expanded view"
            >
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        <div class="relative flex-1">
          <textarea
            [(ngModel)]="content"
            (ngModelChange)="error.set(null)"
            [placeholder]="t.map()['INPUT_PLACEHOLDER']"
            class="h-full w-full resize-none overflow-auto bg-white p-6 font-mono text-sm text-slate-800 focus:outline-none dark:bg-slate-900 dark:text-slate-200"
            [class.bg-red-50]="error()"
            [class.dark:bg-red-900/10]="error()"
          ></textarea>

          @if (error()) {
            <div
              class="absolute right-4 bottom-4 left-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/80 dark:text-red-200"
            >
              <span class="material-symbols-outlined mt-0.5 text-xl">warning</span>
              <div>
                <strong class="block font-bold">{{ t.map()['ERROR_INVALID'] }}</strong>
                <span class="font-mono text-sm opacity-90">{{ error() }}</span>
              </div>
            </div>
          }
        </div>

        <div
          class="glass-subsection flex items-center justify-between border-t px-4 py-2 text-xs text-slate-500 dark:text-slate-400"
        >
          <span>{{ lineCount() }} lines • {{ charCount() }} chars</span>
          @if (content().trim()) {
            @if (error()) {
              <span class="text-red-500">Invalid JSON</span>
            } @else {
              <span class="text-emerald-600 dark:text-emerald-400">Valid JSON</span>
            }
          }
        </div>

        @if (content() && !error()) {
          <app-action-bar
            [content]="content()"
            filename="data.json"
            mimeType="application/json"
            source="JSON Formatter"
          ></app-action-bar>
        }
      </div>
    </dialog>
  `,
})
export class JsonFormatterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  expandedDialog = viewChild<ElementRef<HTMLDialogElement>>('expandedDialog');

  content = signal<string>('');
  indentSize = signal<IndentOption>(2);
  error = signal<string | null>(null);
  isExpanded = signal(false);

  toggleExpanded() {
    if (this.isExpanded()) {
      this.closeExpanded();
    } else {
      this.openExpanded();
    }
  }

  openExpanded() {
    const dialog = this.expandedDialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
    this.isExpanded.set(true);
  }

  closeExpanded() {
    const dialog = this.expandedDialog()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.isExpanded.set(false);
  }

  onExpandedDialogClose() {
    this.isExpanded.set(false);
  }

  onExpandedDialogClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeExpanded();
    }
  }

  lineCount() {
    if (!this.content()) return 0;
    return this.content().split(/\r?\n/).length;
  }

  charCount() {
    return this.content().length;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    const isCmdOrCtrl = event.ctrlKey || event.metaKey;
    if (!isCmdOrCtrl) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.format();
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'm') {
      event.preventDefault();
      this.minify();
    }
  }

  format() {
    if (!this.content().trim()) return;
    const result = formatJson(this.content(), this.indentSize());
    if (result.success) {
      this.content.set(result.output);
      this.error.set(null);
    } else {
      this.error.set(result.error);
    }
  }

  minify() {
    if (!this.content().trim()) return;
    const result = minifyJson(this.content());
    if (result.success) {
      this.content.set(result.output);
      this.error.set(null);
    } else {
      this.error.set(result.error);
    }
  }

  clear() {
    this.content.set('');
    this.error.set(null);
  }

  handleFileDrop(files: FileList) {
    const file = files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.content.set(e.target?.result as string);
        this.format();
      };
      reader.readAsText(file);
    } else {
      this.toast.show('Please drop a JSON file', 'error');
    }
  }
}
