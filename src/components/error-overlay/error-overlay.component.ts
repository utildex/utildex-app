import { Component, inject } from '@angular/core';
import { GlobalErrorService } from '../../services/global-error.service';
import { DbService } from '../../services/db.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-error-overlay',
  standalone: true,
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (errorService.error(); as err) {
      <div
        class="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur"
      >
        <div
          class="w-full max-w-lg overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl dark:border-red-900 dark:bg-slate-900"
        >
          <div class="p-6 text-center">
            <div
              class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30"
            >
              <span class="material-symbols-outlined text-3xl">error</span>
            </div>

            <h2 class="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              {{ t.map()['TITLE'] }}
            </h2>
            <p class="mb-6 text-slate-600 dark:text-slate-300">{{ t.map()['DESC'] }}</p>

            <div
              class="mb-6 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950"
            >
              <code
                class="block font-mono text-xs whitespace-pre-wrap text-red-600 dark:text-red-400"
                >{{ err.message }}</code
              >
            </div>

            <div class="flex justify-center gap-3">
              <button
                (click)="reload()"
                class="bg-primary rounded-xl px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-600"
              >
                {{ t.map()['BTN_RELOAD'] }}
              </button>
              <button
                (click)="resetApp()"
                class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {{ t.map()['BTN_RESET'] }}
              </button>
              <button
                (click)="dismiss()"
                class="px-5 py-2.5 text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
              >
                {{ t.map()['BTN_DISMISS'] }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .animate-fade-in {
        animation: fadeIn 0.2s ease-out;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class ErrorOverlayComponent {
  errorService = inject(GlobalErrorService);
  t = inject(ScopedTranslationService);
  private db = inject(DbService);

  reload() {
    window.location.reload();
  }

  async resetApp() {
    try {
      await this.db.clear();
    } catch (e) {
      console.error('Failed to clear DB during reset', e);
    }
    localStorage.clear();
    window.location.reload();
  }

  dismiss() {
    this.errorService.clear();
  }
}
