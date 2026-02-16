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
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (errorService.error(); as err) {
      <div class="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur flex items-center justify-center p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div class="p-6 text-center">
            <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-symbols-outlined text-3xl">error</span>
            </div>
            
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ t.map()['TITLE'] }}</h2>
            <p class="text-slate-600 dark:text-slate-300 mb-6">{{ t.map()['DESC'] }}</p>
            
            <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg mb-6 text-left max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800">
               <code class="text-xs font-mono text-red-600 dark:text-red-400 block whitespace-pre-wrap">{{ err.message }}</code>
            </div>

            <div class="flex gap-3 justify-center">
              <button (click)="reload()" class="px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
                {{ t.map()['BTN_RELOAD'] }}
              </button>
              <button (click)="resetApp()" class="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                {{ t.map()['BTN_RESET'] }}
              </button>
              <button (click)="dismiss()" class="px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                {{ t.map()['BTN_DISMISS'] }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
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