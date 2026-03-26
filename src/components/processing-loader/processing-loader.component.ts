import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import {
  ProcessingLoaderMode,
  ProcessingLoaderState,
  ProcessingLoaderVariant,
} from './processing-loader.types';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

const DEFAULT_TIPS = ['TIP_LOCAL', 'TIP_SPEED', 'TIP_TABS'];

@Component({
  selector: 'app-processing-loader',
  standalone: true,
  imports: [CommonModule],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (isVisible()) {
      <div [class]="containerClass()" role="status" aria-live="polite" [attr.aria-busy]="active()">
        <div
          class="loader-card w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
        >
          <div class="flex items-start gap-3">
            <div class="mt-0.5 flex h-8 w-8 items-center justify-center">
              @if (state() === 'loading') {
                @switch (variant()) {
                  @case ('bars') {
                    <div class="loader-bars" aria-hidden="true">
                      <span></span><span></span><span></span>
                    </div>
                  }
                  @default {
                    <div class="loader-dots" aria-hidden="true">
                      <span></span><span></span><span></span>
                    </div>
                  }
                }
              } @else if (state() === 'success') {
                <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400"
                  >check_circle</span
                >
              } @else {
                <span class="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
              }
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {{ titleText() }}
              </p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">{{ currentMessage() }}</p>
              @if (currentTip()) {
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {{ t.map()['TIP_PREFIX'] }} {{ currentTip() }}
                </p>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .loader-card {
        animation: loader-enter 180ms ease-out;
      }

      .loader-dots {
        display: inline-flex;
        gap: 4px;
      }

      .loader-dots span {
        width: 6px;
        height: 6px;
        border-radius: 9999px;
        background: currentColor;
        color: rgb(14 165 233);
        animation: dot-bounce 900ms infinite ease-in-out;
      }

      .loader-dots span:nth-child(2) {
        animation-delay: 120ms;
      }

      .loader-dots span:nth-child(3) {
        animation-delay: 240ms;
      }

      .loader-bars {
        display: inline-flex;
        align-items: end;
        gap: 3px;
        height: 18px;
        color: rgb(14 165 233);
      }

      .loader-bars span {
        width: 4px;
        height: 100%;
        border-radius: 9999px;
        background: currentColor;
        animation: bar-pulse 900ms infinite ease-in-out;
      }

      .loader-bars span:nth-child(2) {
        animation-delay: 110ms;
      }

      .loader-bars span:nth-child(3) {
        animation-delay: 220ms;
      }

      @keyframes loader-enter {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes dot-bounce {
        0%,
        80%,
        100% {
          transform: translateY(0);
          opacity: 0.5;
        }
        40% {
          transform: translateY(-5px);
          opacity: 1;
        }
      }

      @keyframes bar-pulse {
        0%,
        100% {
          transform: scaleY(0.4);
          opacity: 0.6;
        }
        50% {
          transform: scaleY(1);
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .loader-card,
        .loader-dots span,
        .loader-bars span {
          animation: none;
        }
      }
    `,
  ],
})
export class ProcessingLoaderComponent implements OnDestroy {
  t = inject(ScopedTranslationService);

  active = input(false);
  state = input<ProcessingLoaderState>('loading');
  mode = input<ProcessingLoaderMode>('inline');
  variant = input<ProcessingLoaderVariant>('dots');

  title = input('');
  messages = input<string[]>([]);
  tips = input<string[]>(DEFAULT_TIPS);

  messageRotationMs = input(2600);
  tipRotationMs = input(6000);
  minVisibleMs = input(0);

  shown = output<void>();
  hidden = output<void>();

  private visible = signal(false);
  private messageIndex = signal(0);
  private tipIndex = signal(0);
  private shownAt = 0;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private messageTimer: ReturnType<typeof setInterval> | null = null;
  private tipTimer: ReturnType<typeof setInterval> | null = null;

  isVisible = this.visible.asReadonly();

  titleText = computed(() => this.title() || this.t.map()['TITLE_DEFAULT'] || 'Processing...');

  containerClass = computed(() => {
    if (this.mode() === 'overlay') {
      return 'fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/20 p-4 dark:bg-slate-950/40';
    }

    return 'inline-flex w-full';
  });

  currentMessage = computed(() => {
    const list = this.messages();
    const map = this.t.map();

    if (list.length > 0) {
      return list[this.messageIndex() % list.length] ?? list[0];
    }

    if (this.state() === 'success') {
      return map['STATUS_SUCCESS'] || 'Completed.';
    }

    if (this.state() === 'error') {
      return map['STATUS_ERROR'] || 'Something went wrong.';
    }

    return map['STATUS_LOADING'] || 'Working on your request...';
  });

  currentTip = computed(() => {
    if (!this.active()) {
      return '';
    }

    const list = this.tips();
    const map = this.t.map();
    if (list.length === 0) {
      return '';
    }

    const selected = list[this.tipIndex() % list.length] ?? list[0];
    return map[selected] || selected;
  });

  constructor() {
    effect(() => {
      const active = this.active();

      if (active) {
        this.showNow();
        this.startRotation();
        return;
      }

      this.stopRotation();
      this.hideWithMinDuration();
    });

    effect(() => {
      if (!this.active()) {
        return;
      }

      this.messages();
      this.tips();
      this.messageRotationMs();
      this.tipRotationMs();
      this.t.map();

      this.messageIndex.set(0);
      this.tipIndex.set(0);
      this.startRotation();
    });
  }

  ngOnDestroy(): void {
    this.stopRotation();
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private showNow(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (this.visible()) {
      return;
    }

    this.visible.set(true);
    this.shownAt = Date.now();
    this.messageIndex.set(0);
    this.tipIndex.set(0);
    this.shown.emit();
  }

  private hideWithMinDuration(): void {
    if (!this.visible()) {
      return;
    }

    const wait = Math.max(0, this.minVisibleMs() - (Date.now() - this.shownAt));
    if (wait === 0) {
      this.hideNow();
      return;
    }

    this.hideTimeout = setTimeout(() => {
      this.hideTimeout = null;
      this.hideNow();
    }, wait);
  }

  private hideNow(): void {
    if (!this.visible()) {
      return;
    }

    this.visible.set(false);
    this.hidden.emit();
  }

  private startRotation(): void {
    this.stopRotation();

    const messageList = this.messages();
    if (messageList.length > 1) {
      this.messageTimer = setInterval(
        () => {
          this.messageIndex.update((i) => i + 1);
        },
        Math.max(500, this.messageRotationMs()),
      );
    }

    const tipList = this.tips();
    if (tipList.length > 1) {
      this.tipTimer = setInterval(
        () => {
          this.tipIndex.update((i) => i + 1);
        },
        Math.max(1500, this.tipRotationMs()),
      );
    }
  }

  private stopRotation(): void {
    if (this.messageTimer) {
      clearInterval(this.messageTimer);
      this.messageTimer = null;
    }

    if (this.tipTimer) {
      clearInterval(this.tipTimer);
      this.tipTimer = null;
    }
  }
}
