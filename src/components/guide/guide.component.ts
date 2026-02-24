import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuideService } from '../../services/guide.service';
import { ScopedTranslationService, provideTranslation } from '../../core/i18n';
import en from '../../i18n/en';
import fr from '../../i18n/fr';
import es from '../../i18n/es';
import zh from '../../i18n/zh';

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (state().isVisible) {
      <div
        class="pointer-events-none fixed z-[70] transition-all duration-300 ease-out"
        [style.top.px]="coords().top"
        [style.left.px]="coords().left"
        [class.opacity-0]="!display()"
        [class.opacity-100]="display()"
        [class.scale-95]="!display()"
        [class.scale-100]="display()"
      >
        <!-- Cloud Body -->
        <div
          class="relative max-w-xs rounded-2xl border border-slate-200 bg-white/90 px-5 py-3 text-slate-900 shadow-xl backdrop-blur-md md:max-w-sm dark:border-slate-700 dark:bg-slate-800/90 dark:text-white"
        >
          <!-- Text Content -->
          <p class="text-center text-sm leading-relaxed font-medium">
            {{ t.get(state().messageKey) || state().messageKey }}
          </p>

          <!-- Triangle (Only if anchored) -->
          @if (state().targetRect) {
            <div
              class="absolute h-4 w-4 rotate-45 transform border-r border-b border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-800/90"
              [style.left.px]="triangleLeft()"
              [class.-bottom-2]="isAbove()"
              [class.-top-2]="!isAbove()"
              [class.border-l]="!isAbove()"
              [class.border-t]="!isAbove()"
              [class.border-r-0]="!isAbove()"
              [class.border-b-0]="!isAbove()"
            ></div>
          }
        </div>
      </div>
    }
  `,
})
export class GuideComponent {
  guide = inject(GuideService);
  t = inject(ScopedTranslationService);

  state = this.guide.state;
  display = signal(false);

  constructor() {
    // Animation tick
    effect(() => {
      if (this.state().isVisible) {
        requestAnimationFrame(() => this.display.set(true));
      } else {
        this.display.set(false);
      }
    });
  }

  // Positioning Logic
  coords = computed(() => {
    const s = this.state();
    if (!s.targetRect) {
      // Broadcast Mode: Bottom Center
      return {
        top: window.innerHeight - 100,
        left: window.innerWidth / 2 - 150,
      };
    }

    const rect = s.targetRect;
    const gap = 12;

    // Default to Above
    let top = rect.top - gap - 60;
    let left = rect.left + rect.width / 2 - 100;

    // Bounds checking (Simplistic)
    if (top < 20) top = rect.bottom + gap;
    if (left < 10) left = 10;
    if (left > window.innerWidth - 210) left = window.innerWidth - 210;

    return { top, left };
  });

  isAbove = computed(() => {
    const s = this.state();
    if (!s.targetRect) return true;
    const c = this.coords();
    return c.top < s.targetRect.top;
  });

  triangleLeft = computed(() => {
    const s = this.state();
    const c = this.coords();
    if (!s.targetRect) return 0;

    const centerTarget = s.targetRect.left + s.targetRect.width / 2;
    const rel = centerTarget - c.left;

    return Math.max(10, Math.min(180, rel - 8));
  });
}
