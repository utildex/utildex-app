import { Component, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
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
      <div
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <div
          class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50"
        >
          <span class="px-1 text-xs font-bold text-slate-500 uppercase">JSON Formatter</span>
          <div class="flex gap-1">
            <button
              (click)="minify()"
              class="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              title="Minify"
            >
              <span class="material-symbols-outlined text-sm">compress</span>
            </button>
            <button
              (click)="format()"
              class="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
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
        class="flex h-[calc(100vh-16rem)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Toolbar -->
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-slate-500 uppercase">{{
                t.map()['INDENT_LABEL']
              }}</label>
              <select
                [(ngModel)]="indentSize"
                (change)="format()"
                class="focus:ring-primary focus:border-primary rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
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
              class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              {{ t.map()['BTN_MINIFY'] }}
            </button>
            <button
              (click)="format()"
              class="bg-primary rounded-lg px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600"
            >
              {{ t.map()['BTN_FORMAT'] }}
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
            class="h-full w-full resize-none bg-white p-6 font-mono text-sm text-slate-800 transition-colors focus:outline-none dark:bg-slate-900 dark:text-slate-200"
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
  `,
})
export class JsonFormatterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);

  content = signal<string>('');
  indentSize = signal<number | 'tab'>(2);
  error = signal<string | null>(null);

  format() {
    if (!this.content().trim()) return;
    try {
      const obj = JSON.parse(this.content());
      const indent = this.indentSize();
      const space = indent === 'tab' ? '\t' : indent;
      this.content.set(JSON.stringify(obj, null, space));
      this.error.set(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Invalid JSON';
      this.error.set(message);
    }
  }

  minify() {
    if (!this.content().trim()) return;
    try {
      const obj = JSON.parse(this.content());
      this.content.set(JSON.stringify(obj));
      this.error.set(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Invalid JSON';
      this.error.set(message);
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
