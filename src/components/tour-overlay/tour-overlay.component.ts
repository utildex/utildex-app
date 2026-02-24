import {
  Component,
  inject,
  computed,
  HostListener,
  ViewChild,
  ElementRef,
  effect,
  ChangeDetectionStrategy,
  signal,
  OnDestroy,
} from '@angular/core';
import { TourService } from '../../services/tour.service';
import { ScopedTranslationService } from '../../core/i18n';
import { NgStyle } from '@angular/common';
import { computePosition, flip, shift, offset, autoUpdate, Placement } from '@floating-ui/dom';

@Component({
  selector: 'app-tour-overlay',
  standalone: true,
  imports: [NgStyle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tour.isActive()) {
      <!-- Backdrop (No blur, just transparent click catcher) -->
      <div class="fixed inset-0 z-[9998]" (click)="tour.cancelTour()"></div>

      <!-- Highlight Cutout (if target exists) -->
      @if (targetRect()) {
        <div
          class="border-primary pointer-events-none fixed z-[9999] rounded-xl border-2 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] transition-all duration-300"
          [ngStyle]="{
            'top.px': targetRect()!.top - 8,
            'left.px': targetRect()!.left - 8,
            'width.px': targetRect()!.width + 16,
            'height.px': targetRect()!.height + 16,
          }"
        ></div>
      } @else {
        <!-- Full screen dark overlay if no target (e.g. center welcome step) -->
        <div
          class="pointer-events-none fixed inset-0 z-[9999] bg-slate-900/70 transition-opacity duration-300"
        ></div>
      }

      <!-- Bubble -->
      <div
        #bubble
        class="animate-fade-in fixed z-[10000] w-80 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 dark:border-slate-700 dark:bg-slate-800"
        [ngStyle]="bubbleStyle()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        <div class="mb-4 flex items-start justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">explore</span>
            <h3 id="tour-title" class="font-bold text-slate-900 dark:text-white">
              {{
                currentStep().i18nTitleKey
                  ? t.map()[currentStep().i18nTitleKey!] || t.map()['TOUR_TITLE']
                  : t.map()['TOUR_TITLE'] || 'Quick Tour'
              }}
            </h3>
          </div>
          <button
            (click)="tour.cancelTour()"
            class="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close tour"
          >
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <p class="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {{ t.map()[currentStep().i18nKey] }}
        </p>

        <div class="flex items-center justify-between">
          <div class="flex gap-1">
            @for (step of tour.steps; track step.id; let i = $index) {
              <div
                class="h-2 w-2 rounded-full transition-colors"
                [class.bg-primary]="i === tour.currentStepIndex()"
                [class.bg-slate-200]="i !== tour.currentStepIndex()"
                [class.dark:bg-slate-700]="i !== tour.currentStepIndex()"
              ></div>
            }
          </div>

          <button
            #nextBtn
            (click)="tour.nextStep()"
            class="bg-primary rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-600"
          >
            {{
              isLastStep()
                ? t.map()['TOUR_BTN_FINISH'] || 'Finish'
                : t.map()['TOUR_BTN_NEXT'] || 'Next'
            }}
          </button>
        </div>
      </div>
    }
  `,
})
export class TourOverlayComponent implements OnDestroy {
  tour = inject(TourService);
  t = inject(ScopedTranslationService);

  @ViewChild('bubble') bubbleRef?: ElementRef<HTMLElement>;
  @ViewChild('nextBtn') nextBtnRef?: ElementRef<HTMLButtonElement>;

  targetRect = this.tour.currentTargetRect;
  targetElement = this.tour.currentTargetElement;

  currentStep = computed(() => this.tour.steps[this.tour.currentStepIndex()]);
  isLastStep = computed(() => this.tour.currentStepIndex() === this.tour.steps.length - 1);

  bubbleStyle = signal<{ top?: string; left?: string; transform?: string }>({});

  private cleanupAutoUpdate?: () => void;

  constructor() {
    effect(() => {
      const isActive = this.tour.isActive();
      const targetEl = this.targetElement();
      const step = this.currentStep();

      // Clean up previous floating UI autoUpdate
      if (this.cleanupAutoUpdate) {
        this.cleanupAutoUpdate();
        this.cleanupAutoUpdate = undefined;
      }

      if (!isActive) return;

      // Focus management
      setTimeout(() => {
        if (this.nextBtnRef?.nativeElement) {
          this.nextBtnRef.nativeElement.focus();
        }
      }, 50);

      if (!targetEl || step.position === 'center') {
        this.bubbleStyle.set({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        });
        return;
      }

      // Use Floating UI for positioning
      setTimeout(() => {
        if (this.bubbleRef?.nativeElement && targetEl) {
          this.cleanupAutoUpdate = autoUpdate(targetEl, this.bubbleRef.nativeElement, () => {
            if (!this.bubbleRef?.nativeElement) return;
            computePosition(targetEl, this.bubbleRef.nativeElement, {
              placement: step.position as Placement,
              middleware: [offset(24), flip(), shift({ padding: 16 })],
            }).then(({ x, y }) => {
              this.bubbleStyle.set({
                left: `${x}px`,
                top: `${y}px`,
              });
              this.tour.updateTargetRect();
            });
          });
        }
      }, 0);
    });
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.tour.isActive()) {
      this.tour.cancelTour();
    }
  }

  ngOnDestroy() {
    if (this.cleanupAutoUpdate) {
      this.cleanupAutoUpdate();
    }
  }
}
