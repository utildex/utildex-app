import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ClipboardService } from '../../services/clipboard.service';
import { ScopedTranslationService, provideTranslation } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-clipboard-history',
  standalone: true,
  imports: [DatePipe],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <div
      class="flex h-full flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
    >
      <!-- Header -->
      <div
        class="glass-subsection flex items-center justify-between border-b p-4"
      >
        <h3 class="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <span class="material-symbols-outlined text-slate-500">content_paste</span>
          {{ t.map()['TITLE'] }}
        </h3>
        @if (history().length > 0) {
          <button
            (click)="clipboard.clearHistory()"
            class="text-xs text-red-500 hover:underline"
            [title]="t.map()['CLEAR_TOOLTIP']"
          >
            {{ t.map()['BTN_CLEAR'] }}
          </button>
        }
      </div>

      <!-- List -->
      <div class="flex-1 space-y-3 overflow-y-auto p-4">
        @if (history().length === 0) {
          <div class="py-10 text-center opacity-50">
            <span class="material-symbols-outlined mb-2 text-4xl">history_edu</span>
            <p class="text-sm">{{ t.map()['EMPTY_STATE'] }}</p>
          </div>
        } @else {
          @for (item of history(); track item.id) {
            <div
              class="glass-surface glass-surface-hover group relative rounded-lg p-3 transition-colors"
            >
              <p class="mb-1 flex justify-between text-xs text-slate-400">
                <span>{{ item.timestamp | date: 'shortTime' }}</span>
                @if (item.source) {
                  <span class="text-[10px] tracking-wider uppercase">{{ item.source }}</span>
                }
              </p>
              <div
                class="line-clamp-3 font-mono text-sm font-medium break-all text-slate-700 dark:text-slate-300"
              >
                {{ item.text }}
              </div>

              <!-- Copy Button Overlay -->
              <button
                (click)="copy(item.text)"
                class="bg-primary/5 absolute inset-0 flex items-center justify-center opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100"
              >
                <span
                  class="text-primary flex translate-y-2 transform items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-sm transition-transform group-hover:translate-y-0 dark:bg-slate-900"
                >
                  <span class="material-symbols-outlined text-sm">content_copy</span>
                  {{ t.map()['BTN_COPY'] }}
                </span>
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class ClipboardHistoryComponent {
  clipboard = inject(ClipboardService);
  t = inject(ScopedTranslationService);

  history = this.clipboard.history;

  copy(text: string) {
    this.clipboard.copy(text);
  }
}
