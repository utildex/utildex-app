import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuideService } from '../../services/guide.service';
import { ScopedTranslationService, provideTranslation } from '../../core/i18n';
import en from '../../i18n/en';
import fr from '../../i18n/fr';
import es from '../../i18n/es';
import zh from '../../i18n/zh';

// Reuse main app translations + potentially specific guide ones if needed
// For now we just import the root ones, assuming keys are there.

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (state().isVisible) {
      <div 
        class="fixed z-[70] transition-all duration-300 ease-out pointer-events-none"
        [style.top.px]="coords().top"
        [style.left.px]="coords().left"
        [class.opacity-0]="!display()"
        [class.opacity-100]="display()"
        [class.scale-95]="!display()"
        [class.scale-100]="display()"
      >
        <!-- Cloud Body -->
        <div class="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-900 dark:text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-xs md:max-w-sm">
            <!-- Text Content -->
            <p class="text-sm font-medium leading-relaxed text-center">
               {{ t.get(state().messageKey) || state().messageKey }}
            </p>

            <!-- Triangle (Only if anchored) -->
            @if (state().targetRect) {
               <div 
                 class="absolute w-4 h-4 bg-white/90 dark:bg-slate-800/90 border-r border-b border-slate-200 dark:border-slate-700 transform rotate-45"
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
  `
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
            left: (window.innerWidth / 2) - 150 // centeredish (css transform handles exact center usually but here we do simple)
        };
    }

    const rect = s.targetRect;
    const gap = 12;
    
    // Default to Above
    let top = rect.top - gap - 60; // Approximate height of bubble
    let left = rect.left + (rect.width / 2) - 100; // Center bubble relative to target

    // Bounds checking (Simplistic)
    if (top < 20) top = rect.bottom + gap; // Flip to bottom
    if (left < 10) left = 10;
    if (left > window.innerWidth - 210) left = window.innerWidth - 210;

    return { top, left };
  });
  
  // Calculate if we are above or below target
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
      
      // Calculate relative position of target center within the bubble
      const centerTarget = s.targetRect.left + (s.targetRect.width / 2);
      const rel = centerTarget - c.left;
      
      // Clamp triangle so it doesn't detach from corners
      return Math.max(10, Math.min(180, rel - 8)); // 200 width assumption fallback
  });
}
