import { Component, signal, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { generateLorem } from './lorem-ipsum.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-lorem-ipsum',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="lorem-ipsum">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <div
          class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50"
        >
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-slate-500">description</span>
            <span class="text-xs font-bold text-slate-600 uppercase dark:text-slate-300"
              >Lorem Ipsum</span
            >
          </div>
          <input
            type="number"
            min="1"
            max="5"
            [(ngModel)]="count"
            class="h-6 w-12 rounded border bg-white text-center text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            title="Paragraphs"
          />
        </div>
        <div
          class="max-h-[150px] flex-1 overflow-y-auto p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
        >
          {{ output()[0] }}
        </div>
        <div class="flex gap-2 border-t border-slate-100 p-2 dark:border-slate-700">
          <button
            (click)="generate()"
            class="flex-1 rounded bg-slate-100 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            {{ t.map()['BTN_GENERATE'] }}
          </button>
          <button
            (click)="copy()"
            class="bg-primary flex-1 rounded py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
          >
            {{ t.map()['BTN_COPY'] }}
          </button>
        </div>
      </div>
    }

    <ng-template #mainContent>
      <div
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Toolbar -->
        <div
          class="flex flex-col items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 p-6 sm:flex-row dark:border-slate-700 dark:bg-slate-800/50"
        >
          <div class="flex w-full items-center gap-6 sm:w-auto">
            <label class="flex flex-col text-xs font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['LABEL_PARAGRAPHS'] }}
              <input
                type="number"
                min="1"
                max="20"
                [(ngModel)]="count"
                class="focus:ring-primary focus:border-primary mt-1 block w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 shadow-sm focus:outline-none sm:text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </label>

            <label
              class="mt-5 flex cursor-pointer items-center gap-3 rounded p-2 transition-colors select-none hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <input
                type="checkbox"
                [(ngModel)]="startWithLorem"
                class="text-primary focus:ring-primary h-4 w-4 rounded border-slate-300"
              />
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{
                t.map()['LABEL_START_LOREM']
              }}</span>
            </label>
          </div>

          <div class="flex w-full gap-3 sm:w-auto">
            <button
              (click)="generate()"
              class="bg-primary focus:ring-primary inline-flex flex-1 items-center justify-center rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:outline-none active:scale-95 sm:flex-none"
            >
              <span class="material-symbols-outlined mr-2 text-lg">autorenew</span>
              {{ t.map()['BTN_GENERATE'] }}
            </button>
          </div>
        </div>

        <!-- Output -->
        <div class="min-h-[300px] bg-white p-8 dark:bg-slate-800">
          @if (output().length > 0) {
            <div class="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              @for (para of output(); track $index) {
                <p class="mb-6 text-lg leading-relaxed last:mb-0">{{ para }}</p>
              }
            </div>
          } @else {
            <div class="flex h-full flex-col items-center justify-center py-12 text-slate-400">
              <span class="material-symbols-outlined mb-4 text-5xl opacity-50">text_fields</span>
              <p class="text-lg">{{ t.map()['EMPTY_STATE'] }}</p>
            </div>
          }
        </div>

        <!-- Action Bar -->
        @if (output().length > 0) {
          <app-action-bar
            [content]="resultString()"
            filename="lorem-ipsum.txt"
            source="Lorem Ipsum"
            [allowPrint]="true"
          ></app-action-bar>
        }
      </div>
    </ng-template>
  `,
})
export class LoremIpsumComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  clipboard = inject(ClipboardService);

  count = signal<number>(3);
  startWithLorem = signal<boolean>(true);
  output = signal<string[]>([]);

  // Computed string for export
  resultString = computed(() => this.output().join('\\n\\n'));

  constructor() {
    this.generate();
  }

  generate() {
    this.output.set(
      generateLorem({
        count: this.count(),
        startWithLorem: this.startWithLorem(),
      }),
    );
  }

  copy() {
    this.clipboard.copy(this.resultString(), 'Lorem Ipsum');
  }
}
