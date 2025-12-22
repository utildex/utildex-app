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
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <div class="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl">
      <!-- Header -->
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
        <h3 class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-slate-500">content_paste</span>
          {{ t.map()['TITLE'] }}
        </h3>
        @if (history().length > 0) {
          <button (click)="clipboard.clearHistory()" class="text-xs text-red-500 hover:underline" [title]="t.map()['CLEAR_TOOLTIP']">
            {{ t.map()['BTN_CLEAR'] }}
          </button>
        }
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        @if (history().length === 0) {
          <div class="text-center py-10 opacity-50">
            <span class="material-symbols-outlined text-4xl mb-2">history_edu</span>
            <p class="text-sm">{{ t.map()['EMPTY_STATE'] }}</p>
          </div>
        } @else {
          @for (item of history(); track item.id) {
            <div class="group relative bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700 hover:border-primary dark:hover:border-primary transition-colors">
              <p class="text-xs text-slate-400 mb-1 flex justify-between">
                <span>{{ item.timestamp | date:'shortTime' }}</span>
                @if (item.source) { <span class="uppercase tracking-wider text-[10px]">{{ item.source }}</span> }
              </p>
              <div class="text-sm font-mono text-slate-700 dark:text-slate-300 break-all line-clamp-3 font-medium">
                {{ item.text }}
              </div>
              
              <!-- Copy Button Overlay -->
              <button 
                (click)="copy(item.text)"
                class="absolute inset-0 bg-primary/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <span class="bg-white dark:bg-slate-900 text-primary shadow-sm px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                  <span class="material-symbols-outlined text-sm">content_copy</span>
                  {{ t.map()['BTN_COPY'] }}
                </span>
              </button>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class ClipboardHistoryComponent {
  clipboard = inject(ClipboardService);
  t = inject(ScopedTranslationService);
  
  history = this.clipboard.history;

  copy(text: string) {
    this.clipboard.copy(text);
  }
}