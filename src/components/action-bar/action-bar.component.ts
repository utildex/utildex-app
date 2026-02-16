
import { Component, input, inject, computed } from '@angular/core';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <div class="flex flex-wrap items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl">
      <div class="mr-auto text-sm text-slate-500 font-medium flex items-center gap-2">
        <span class="material-symbols-outlined text-lg" aria-hidden="true">check_circle</span>
        {{ t.map()['READY_LABEL'] }}
      </div>

      <div class="flex gap-2">
        @if (canCopy()) {
          <button 
            (click)="copy()" 
            class="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-95"
            [title]="t.map()['BTN_COPY']"
            [attr.aria-label]="t.map()['BTN_COPY']"
          >
            <span class="material-symbols-outlined text-lg sm:mr-2" aria-hidden="true">content_copy</span>
            <span class="hidden sm:inline">{{ t.map()['BTN_COPY'] }}</span>
          </button>
        }

        <button 
          (click)="download()"  
          class="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-95"
          [title]="t.map()['BTN_DOWNLOAD']"
          [attr.aria-label]="t.map()['BTN_DOWNLOAD']"
        >
          <span class="material-symbols-outlined text-lg sm:mr-2" aria-hidden="true">download</span>
          <span class="hidden sm:inline">{{ t.map()['BTN_DOWNLOAD'] }}</span>
        </button>

        @if (canPrint()) {
          <button 
            (click)="print()"  
            class="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-95"
            [title]="t.map()['BTN_PRINT']"
            [attr.aria-label]="t.map()['BTN_PRINT']"
          >
            <span class="material-symbols-outlined text-lg sm:mr-2" aria-hidden="true">print</span>
            <span class="hidden sm:inline">{{ t.map()['BTN_PRINT'] }}</span>
          </button>
        }
      </div>
    </div>
  `
})
export class ActionBarComponent {
  content = input.required<string | Uint8Array>();
  filename = input<string>('result.txt');
  mimeType = input<string>('text/plain');
  source = input<string>('Tool');
  allowPrint = input<boolean>(false);

  clipboard = inject(ClipboardService);
  t = inject(ScopedTranslationService);

  canCopy = computed(() => typeof this.content() === 'string');
  canPrint = computed(() => this.allowPrint() && typeof this.content() === 'string');

  copy() {
    const val = this.content();
    if (typeof val === 'string') {
      this.clipboard.copy(val, this.source());
    }
  }

  download() {
    try {
      const val = this.content();
      const blob = new Blob([val as unknown as BlobPart], { type: this.mimeType() });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.filename();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }

  print() {
    const val = this.content();
    if (typeof val !== 'string') return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      const doc = printWindow.document;
      doc.title = this.filename();

      const style = doc.createElement('style');
      style.textContent = 'body{font-family:sans-serif;white-space:pre-wrap;padding:20px;}';
      doc.head.appendChild(style);

      const pre = doc.createElement('pre');
      pre.textContent = val;
      doc.body.appendChild(pre);

      doc.close();
      printWindow.focus();
      printWindow.print();
    }
  }
}
