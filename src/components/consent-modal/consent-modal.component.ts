import { Component, inject } from '@angular/core';
import { ConsentService } from '../../services/platform/consent.service';
import { type ConsentConfig } from '../../core/consent-config';
import { ScopedTranslationService, provideTranslation } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

/**
 * Generic consent modal driven by ConsentService.state.
 *
 * Renders one of five phases:
 *   prompt → downloading → complete  (happy path)
 *   prompt → refused                  (user declines)
 *   downloading → error               (download fails)
 *
 * The component is fully reusable — any feature provides a ConsentConfig
 * via ConsentService.ask() and the modal renders accordingly.
 */
@Component({
  selector: 'app-consent-modal',
  standalone: true,
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (state(); as s) {
      <div class="fixed inset-0 z-[2100] flex items-center justify-center p-4">
        <!-- Backdrop — not interactive for consent; user must click a button -->
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>

        <!-- Modal -->
        <div
          class="glass-surface-strong animate-scale-in relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/80 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:shadow-black/40"
        >
          <!-- ──────── PROMPT PHASE ──────── -->
          @if (s.phase === 'prompt') {
            <div class="flex flex-col gap-5 p-6">
              <!-- Icon + Title -->
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary text-3xl">
                  {{ s.config.icon }}
                </span>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">
                  {{ s.config.title }}
                </h2>
              </div>

              <!-- Description -->
              <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {{ s.config.description }}
              </p>

              <!-- Size & Storage badge -->
              <div
                class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span class="material-symbols-outlined text-base">cloud_download</span>
                  <span>{{ t.map()['SIZE_PREFIX'] }}{{ s.config.sizeLabel }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span class="material-symbols-outlined text-base">lock</span>
                  <span>{{ s.config.storageLabel || t.map()['STORED_IN'] }}</span>
                </div>
              </div>

              <!-- Optional pre-download note -->
              @if (s.config.preDownloadNote) {
                <p class="text-xs italic text-slate-400 dark:text-slate-500">
                  {{ s.config.preDownloadNote }}
                </p>
              }

              <!-- Buttons -->
              <div class="flex flex-col gap-2">
                <button
                  (click)="onConsent()"
                  class="bg-primary hover:bg-primary-dark flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors"
                >
                  <span class="material-symbols-outlined text-lg">download</span>
                  {{ downloadButtonLabel(s.config) }}
                </button>
                <button
                  (click)="onRefuse()"
                  class="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  {{ t.map()['NOT_NOW_BUTTON'] }}
                </button>
              </div>
            </div>
          }

          <!-- ──────── DOWNLOADING PHASE ──────── -->
          @if (s.phase === 'downloading') {
            <div class="flex flex-col gap-5 p-6">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ t.map()['DOWNLOADING_TITLE'] }}
              </h2>

              <!-- Progress bar -->
              <div class="flex flex-col gap-2">
                <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    class="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                    [style.width.%]="s.progress"
                  ></div>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-500">
                  <span>{{ s.progress }}%</span>
                  <span>{{ s.config.sizeLabel }}</span>
                </div>
              </div>

              <button
                (click)="onCancel()"
                class="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {{ t.map()['CANCEL_BUTTON'] }}
              </button>
            </div>
          }

          <!-- ──────── COMPLETE PHASE ──────── -->
          @if (s.phase === 'complete') {
            <div class="flex flex-col items-center gap-4 p-6 text-center">
              <span class="material-symbols-outlined text-5xl text-green-500">check_circle</span>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ t.map()['COMPLETE_TITLE'] }}
              </h2>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                {{ t.map()['COMPLETE_MESSAGE'] }}
              </p>
            </div>
          }

          <!-- ──────── REFUSED PHASE ──────── -->
          @if (s.phase === 'refused') {
            <div class="flex flex-col gap-4 p-6">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-3xl text-slate-400">info</span>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">
                  {{ t.map()['REFUSED_TITLE'] }}
                </h2>
              </div>
              <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {{ s.config.refuseMessage }}
              </p>
              <button
                (click)="onDismiss()"
                class="bg-primary hover:bg-primary-dark flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors"
              >
                {{ t.map()['DISMISS_BUTTON'] }}
              </button>
            </div>
          }

          <!-- ──────── ERROR PHASE ──────── -->
          @if (s.phase === 'error') {
            <div class="flex flex-col gap-4 p-6">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-3xl text-red-500">error</span>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">
                  {{ t.map()['ERROR_TITLE'] }}
                </h2>
              </div>
              <p class="text-sm leading-relaxed text-red-600 dark:text-red-400">
                {{ t.map()['ERROR_PREFIX'] }}{{ s.error }}
              </p>
              <div class="flex gap-2">
                <button
                  (click)="onRetry()"
                  class="bg-primary hover:bg-primary-dark flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors"
                >
                  <span class="material-symbols-outlined text-lg">refresh</span>
                  {{ t.map()['RETRY_BUTTON'] }}
                </button>
                <button
                  (click)="onDismiss()"
                  class="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  {{ t.map()['ERROR_DISMISS_BUTTON'] }}
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ConsentModalComponent {
  private readonly consentService = inject(ConsentService);

  /** Translation service — scoped to this component's i18n files. */
  protected readonly t = inject(ScopedTranslationService);

  /** Read the current modal state from the service. null → hidden. */
  protected readonly state = this.consentService.state;

  // ─── Button handlers ───────────────────────────────────────────────────

  protected onConsent(): void {
    this.consentService.consent();
  }

  protected onRefuse(): void {
    this.consentService.refuse();
  }

  protected onDismiss(): void {
    this.consentService.dismiss();
  }

  protected onCancel(): void {
    this.consentService.dismiss();
  }

  protected onRetry(): void {
    this.consentService.consent();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  protected downloadButtonLabel(config: ConsentConfig): string {
    return `${this.t.map()['DOWNLOAD_BUTTON']} (${config.sizeLabel})`;
  }
}
