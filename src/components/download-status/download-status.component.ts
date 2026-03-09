import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineManagerService } from '../../services/offline-manager.service';
import { ScopedTranslationService, provideTranslation } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-download-status',
  standalone: true,
  imports: [CommonModule],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (offline.isDownloading()) {
      <div
        class="glass-surface animate-slide-up fixed right-4 bottom-4 z-50 w-80 rounded-xl p-4"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <span class="material-symbols-outlined text-primary animate-bounce"
              >cloud_download</span
            >
            {{ offline.isStopping() ? t.map()['TITLE_STOPPING'] : t.map()['TITLE_DOWNLOADING'] }}
          </h3>
          <button
            (click)="offline.cancelDownload()"
            class="text-slate-400 transition-colors hover:text-red-500"
            [title]="t.map()['BTN_CANCEL']"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            class="bg-primary h-2.5 rounded-full transition-all duration-300"
            [style.width.%]="offline.progress()"
          ></div>
        </div>

        <div class="flex justify-between font-mono text-xs text-slate-500 dark:text-slate-400">
          <span>{{
            t
              .map()
              ['STATUS_PROGRESS'].replace('{0}', offline.downloadedCount().toString())
              .replace('{1}', offline.totalTools().toString())
          }}</span>
          <span>{{ offline.progress() }}%</span>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .animate-slide-up {
        animation: slideUp 0.3s ease-out;
      }
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class DownloadStatusComponent {
  offline = inject(OfflineManagerService);
  t = inject(ScopedTranslationService);
}
