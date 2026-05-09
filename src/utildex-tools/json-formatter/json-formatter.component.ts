import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
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
import {
  formatJson,
  minifyJson,
  type FormatResult,
  type IndentOption,
} from './json-formatter.kernel';
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
          <span class="px-1 text-xs font-bold text-slate-500 uppercase">{{
            t.map()['WIDGET_TITLE']
          }}</span>
          <div class="flex gap-1">
            <button
              (click)="openExpanded()"
              class="glass-control rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              [title]="t.map()['TITLE_EXPAND']"
            >
              <span class="material-symbols-outlined text-sm">open_in_full</span>
            </button>
            <button
              (click)="minify()"
              class="glass-control rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              [title]="t.map()['TITLE_MINIFY']"
            >
              <span class="material-symbols-outlined text-sm">compress</span>
            </button>
            <button
              (click)="format()"
              class="glass-control rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              [title]="t.map()['TITLE_FORMAT']"
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
              [title]="
                isExpanded() ? t.map()['TITLE_EXIT_EXPANDED'] : t.map()['TITLE_EXPAND_EDITOR']
              "
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
            #editorTextarea
            appFileDrop
            (fileDropped)="handleFileDrop($event)"
            [(ngModel)]="content"
            (ngModelChange)="onEditorInput()"
            (scroll)="onEditorScroll('main')"
            [placeholder]="t.map()['INPUT_PLACEHOLDER']"
            class="h-full w-full resize-none overflow-auto bg-white p-6 font-mono text-sm text-slate-800 transition-colors focus:outline-none dark:bg-slate-900 dark:text-slate-200"
            [class.bg-red-50]="error()"
            [class.dark:bg-red-900/10]="error()"
          ></textarea>

          @if (errorLine() && mainErrorMarkerTop() !== null) {
            <div
              class="pointer-events-none absolute right-6 left-6 z-[1] rounded-md border border-red-200/70 bg-red-100/45 dark:border-red-700/60 dark:bg-red-900/20"
              [style.top.px]="mainErrorMarkerTop()"
              [style.height.px]="22"
            ></div>
          }

          <!-- File Drop Overlay Hint -->
          <div
            class="bg-primary/10 border-primary pointer-events-none absolute inset-0 z-10 hidden items-center justify-center rounded-xl border-2 border-dashed group-[.drag-over]:flex"
          >
            <div
              class="text-primary rounded-full bg-white px-4 py-2 font-bold shadow-lg dark:bg-slate-800"
            >
              {{ t.map()['DROP_HINT'] }}
            </div>
          </div>

          <!-- Error Message -->
          @if (error() && isErrorBannerVisible()) {
            <div
              class="animate-fade-in absolute right-4 bottom-4 left-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/80 dark:text-red-200"
            >
              <span class="material-symbols-outlined mt-0.5 text-xl">warning</span>
              <div class="min-w-0 flex-1">
                <strong class="block font-bold">{{ t.map()['ERROR_INVALID'] }}</strong>
                <span class="font-mono text-sm opacity-90">{{ error() }}</span>
                @if (errorLine() && errorColumn()) {
                  <div class="mt-1 text-xs opacity-80">
                    {{ t.map()['ERROR_LINE'] }} {{ errorLine() }}, {{ t.map()['ERROR_COLUMN'] }}
                    {{ errorColumn() }}
                  </div>
                }
              </div>
              <button
                (click)="isErrorBannerVisible.set(false)"
                class="rounded p-1 text-red-700/70 transition-colors hover:bg-red-200/70 hover:text-red-800 dark:text-red-200/80 dark:hover:bg-red-800/40"
                [title]="t.map()['TITLE_DISMISS_ERROR']"
                [attr.aria-label]="t.map()['ARIA_DISMISS_ERROR']"
              >
                <span class="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          }

          @if (error() && !isErrorBannerVisible()) {
            <button
              (click)="showErrorBanner()"
              class="absolute right-4 bottom-4 z-20 flex items-center gap-1 rounded-full border border-red-300 bg-red-100/95 px-3 py-1 text-xs font-semibold text-red-700 shadow-md transition-colors hover:bg-red-200 dark:border-red-800 dark:bg-red-900/80 dark:text-red-200"
              [title]="t.map()['TITLE_SHOW_ERROR']"
            >
              <span class="material-symbols-outlined text-sm">warning</span>
              {{ t.map()['ERROR_CHIP'] }}
            </button>
          }
        </div>

        <!-- Status -->
        <div
          class="glass-subsection flex items-center justify-between border-t px-4 py-2 text-xs text-slate-500 dark:text-slate-400"
        >
          <span>
            {{ lineCount() }} {{ t.map()['STATUS_LINES'] }} • {{ charCount() }}
            {{ t.map()['STATUS_CHARS'] }}
          </span>
          @if (content().trim()) {
            @if (error()) {
              <span class="text-red-500">{{ t.map()['STATUS_INVALID'] }}</span>
            } @else {
              <span class="text-emerald-600 dark:text-emerald-400">{{
                t.map()['STATUS_VALID']
              }}</span>
            }
          }
        </div>

        <!-- Actions -->
        @if (content() && !error()) {
          <app-action-bar
            [content]="content()"
            filename="data.json"
            mimeType="application/json"
            [source]="t.map()['ACTION_SOURCE']"
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
            <span class="text-xs font-bold text-slate-500 uppercase">{{
              t.map()['EXPANDED_TITLE']
            }}</span>
            <span class="text-xs text-slate-400">{{ t.map()['EXPANDED_SHORTCUT_HINT'] }}</span>
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
              [title]="t.map()['TITLE_CLOSE_EXPANDED']"
            >
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        <div class="relative flex-1">
          <textarea
            #expandedTextarea
            [(ngModel)]="content"
            (ngModelChange)="onEditorInput()"
            (scroll)="onEditorScroll('expanded')"
            [placeholder]="t.map()['INPUT_PLACEHOLDER']"
            class="h-full w-full resize-none overflow-auto bg-white p-6 font-mono text-sm text-slate-800 focus:outline-none dark:bg-slate-900 dark:text-slate-200"
            [class.bg-red-50]="error()"
            [class.dark:bg-red-900/10]="error()"
          ></textarea>

          @if (errorLine() && expandedErrorMarkerTop() !== null) {
            <div
              class="pointer-events-none absolute right-6 left-6 z-[1] rounded-md border border-red-200/70 bg-red-100/45 dark:border-red-700/60 dark:bg-red-900/20"
              [style.top.px]="expandedErrorMarkerTop()"
              [style.height.px]="22"
            ></div>
          }

          @if (error() && isErrorBannerVisible()) {
            <div
              class="absolute right-4 bottom-4 left-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/80 dark:text-red-200"
            >
              <span class="material-symbols-outlined mt-0.5 text-xl">warning</span>
              <div class="min-w-0 flex-1">
                <strong class="block font-bold">{{ t.map()['ERROR_INVALID'] }}</strong>
                <span class="font-mono text-sm opacity-90">{{ error() }}</span>
                @if (errorLine() && errorColumn()) {
                  <div class="mt-1 text-xs opacity-80">
                    {{ t.map()['ERROR_LINE'] }} {{ errorLine() }}, {{ t.map()['ERROR_COLUMN'] }}
                    {{ errorColumn() }}
                  </div>
                }
              </div>
              <button
                (click)="isErrorBannerVisible.set(false)"
                class="rounded p-1 text-red-700/70 transition-colors hover:bg-red-200/70 hover:text-red-800 dark:text-red-200/80 dark:hover:bg-red-800/40"
                [title]="t.map()['TITLE_DISMISS_ERROR']"
                [attr.aria-label]="t.map()['ARIA_DISMISS_ERROR']"
              >
                <span class="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          }

          @if (error() && !isErrorBannerVisible()) {
            <button
              (click)="showErrorBanner()"
              class="absolute right-4 bottom-4 z-20 flex items-center gap-1 rounded-full border border-red-300 bg-red-100/95 px-3 py-1 text-xs font-semibold text-red-700 shadow-md transition-colors hover:bg-red-200 dark:border-red-800 dark:bg-red-900/80 dark:text-red-200"
              [title]="t.map()['TITLE_SHOW_ERROR']"
            >
              <span class="material-symbols-outlined text-sm">warning</span>
              {{ t.map()['ERROR_CHIP'] }}
            </button>
          }
        </div>

        <div
          class="glass-subsection flex items-center justify-between border-t px-4 py-2 text-xs text-slate-500 dark:text-slate-400"
        >
          <span>
            {{ lineCount() }} {{ t.map()['STATUS_LINES'] }} • {{ charCount() }}
            {{ t.map()['STATUS_CHARS'] }}
          </span>
          @if (content().trim()) {
            @if (error()) {
              <span class="text-red-500">{{ t.map()['STATUS_INVALID'] }}</span>
            } @else {
              <span class="text-emerald-600 dark:text-emerald-400">{{
                t.map()['STATUS_VALID']
              }}</span>
            }
          }
        </div>

        @if (content() && !error()) {
          <app-action-bar
            [content]="content()"
            filename="data.json"
            mimeType="application/json"
            [source]="t.map()['ACTION_SOURCE']"
          ></app-action-bar>
        }
      </div>
    </dialog>
  `,
})
export class JsonFormatterComponent implements OnDestroy {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  expandedDialog = viewChild<ElementRef<HTMLDialogElement>>('expandedDialog');
  editorTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('editorTextarea');
  expandedTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('expandedTextarea');

  content = signal<string>('');
  indentSize = signal<IndentOption>(2);
  error = signal<string | null>(null);
  isExpanded = signal(false);
  errorPosition = signal<number | null>(null);
  errorLine = signal<number | null>(null);
  errorColumn = signal<number | null>(null);
  isErrorBannerVisible = signal(false);
  mainErrorMarkerTop = signal<number | null>(null);
  expandedErrorMarkerTop = signal<number | null>(null);

  private hideErrorBannerTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly errorBannerDurationMs = 4200;

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
    setTimeout(() => this.updateErrorMarker('expanded'), 0);
  }

  closeExpanded() {
    const dialog = this.expandedDialog()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.isExpanded.set(false);
  }

  onExpandedDialogClose() {
    this.isExpanded.set(false);
    this.expandedErrorMarkerTop.set(null);
  }

  onExpandedDialogClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeExpanded();
    }
  }

  onEditorInput() {
    this.clearErrorState();
  }

  onEditorScroll(mode: 'main' | 'expanded') {
    this.updateErrorMarker(mode);
  }

  showErrorBanner() {
    this.isErrorBannerVisible.set(true);
    this.clearErrorBannerTimer();
    this.hideErrorBannerTimer = setTimeout(() => {
      this.isErrorBannerVisible.set(false);
      this.hideErrorBannerTimer = null;
    }, this.errorBannerDurationMs);
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
      this.clearErrorState();
    } else {
      this.applyError(result);
    }
  }

  minify() {
    if (!this.content().trim()) return;
    const result = minifyJson(this.content());
    if (result.success) {
      this.content.set(result.output);
      this.clearErrorState();
    } else {
      this.applyError(result);
    }
  }

  clear() {
    this.content.set('');
    this.clearErrorState();
  }

  handleFileDrop(files: FileList) {
    const file = files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.content.set(e.target?.result as string);
        this.clearErrorState();
        this.format();
      };
      reader.readAsText(file);
    } else {
      this.toast.show(this.t.map()['TOAST_DROP_JSON'], 'error');
    }
  }

  private applyError(result: FormatResult) {
    this.error.set(result.error);
    this.errorPosition.set(result.errorDetails?.position ?? null);
    this.errorLine.set(result.errorDetails?.line ?? null);
    this.errorColumn.set(result.errorDetails?.column ?? null);
    this.showErrorBanner();

    setTimeout(() => {
      this.updateErrorMarker('main');
      this.updateErrorMarker('expanded');
      this.focusErrorPosition();
    }, 0);
  }

  private clearErrorState() {
    this.error.set(null);
    this.errorPosition.set(null);
    this.errorLine.set(null);
    this.errorColumn.set(null);
    this.mainErrorMarkerTop.set(null);
    this.expandedErrorMarkerTop.set(null);
    this.isErrorBannerVisible.set(false);
    this.clearErrorBannerTimer();
  }

  private clearErrorBannerTimer() {
    if (this.hideErrorBannerTimer) {
      clearTimeout(this.hideErrorBannerTimer);
      this.hideErrorBannerTimer = null;
    }
  }

  ngOnDestroy() {
    this.clearErrorBannerTimer();
  }

  private updateErrorMarker(mode: 'main' | 'expanded') {
    const line = this.errorLine();
    if (!line) {
      if (mode === 'main') this.mainErrorMarkerTop.set(null);
      else this.expandedErrorMarkerTop.set(null);
      return;
    }

    const target =
      mode === 'main'
        ? this.editorTextarea()?.nativeElement
        : this.expandedTextarea()?.nativeElement;
    if (!target) return;

    const style = window.getComputedStyle(target);
    const lineHeight = Number.parseFloat(style.lineHeight) || 20;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const top = paddingTop + (line - 1) * lineHeight - target.scrollTop;

    if (mode === 'main') this.mainErrorMarkerTop.set(top);
    else this.expandedErrorMarkerTop.set(top);
  }

  private focusErrorPosition() {
    const position = this.errorPosition();
    if (position == null) return;

    const target = this.isExpanded()
      ? this.expandedTextarea()?.nativeElement
      : this.editorTextarea()?.nativeElement;
    if (!target) return;

    target.focus();
    target.setSelectionRange(position, position + 1);
  }
}
