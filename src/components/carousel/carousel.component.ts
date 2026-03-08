import {
  Component,
  input,
  computed,
  TemplateRef,
  ElementRef,
  viewChild,
  OnDestroy,
  effect,
  ChangeDetectionStrategy,
  NgZone,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="group relative w-full"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
      (touchstart)="pause()"
      (touchend)="resume()"
    >
      @if (enableInfiniteScroll() || items().length > 1) {
        <button
          type="button"
          class="focus:ring-primary absolute top-1/2 left-2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 p-3 text-slate-700 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:scale-105 focus:opacity-100 focus:ring-2 focus:outline-none active:scale-95 sm:left-4 sm:flex dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200"
          (click)="scroll('left')"
          aria-label="Previous slide"
        >
          <span class="material-symbols-outlined text-2xl">chevron_left</span>
        </button>

        <button
          type="button"
          class="focus:ring-primary absolute top-1/2 right-2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 p-3 text-slate-700 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:scale-105 focus:opacity-100 focus:ring-2 focus:outline-none active:scale-95 sm:right-4 sm:flex dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200"
          (click)="scroll('right')"
          aria-label="Next slide"
        >
          <span class="material-symbols-outlined text-2xl">chevron_right</span>
        </button>
      }

      <div
        #scrollContainer
        class="scrollbar-hide -mx-4 flex scroll-pl-4 gap-4 overflow-x-auto px-4 py-10 sm:mx-0 sm:scroll-pl-0 sm:px-0"
        [class.snap-x]="!marquee()"
        [class.snap-mandatory]="!marquee()"
        style="scrollbar-width: none; -ms-overflow-style: none;"
        (scroll)="onScroll()"
        (wheel)="onWheel($event)"
      >
        <!-- Pre-clones for infinite backward scroll -->
        @if (enableInfiniteScroll()) {
          @for (item of items(); track trackByFn($index, item) + '_pre'; let i = $index) {
            <div
              class="flex-shrink-0 snap-start transition-opacity duration-300"
              [class.w-[300px]]="marquee()"
              [class.w-[85%]]="!marquee()"
              [class.sm:w-[calc(50%-1rem)]]="!marquee()"
              [class.lg:w-[calc(33.333%-1rem)]]="!marquee()"
              [class.xl:w-[calc(25%-1rem)]]="!marquee()"
            >
              <ng-container
                *ngTemplateOutlet="
                  itemTemplate() || defaultTemplate;
                  context: { $implicit: item, index: i }
                "
              ></ng-container>
            </div>
          }
        }

        <!-- Original Items -->
        @for (item of items(); track trackByFn($index, item); let i = $index) {
          <div
            class="flex-shrink-0 snap-start transition-opacity duration-300"
            [class.w-[300px]]="marquee()"
            [class.w-[85%]]="!marquee()"
            [class.sm:w-[calc(50%-1rem)]]="!marquee()"
            [class.lg:w-[calc(33.333%-1rem)]]="!marquee()"
            [class.xl:w-[calc(25%-1rem)]]="!marquee()"
          >
            <ng-container
              *ngTemplateOutlet="
                itemTemplate() || defaultTemplate;
                context: { $implicit: item, index: i }
              "
            ></ng-container>
          </div>
        }

        <!-- Post-clones for infinite forward scroll -->
        @if (enableInfiniteScroll()) {
          @for (item of items(); track trackByFn($index, item) + '_post'; let i = $index) {
            <div
              class="flex-shrink-0 snap-start transition-opacity duration-300"
              [class.w-[300px]]="marquee()"
              [class.w-[85%]]="!marquee()"
              [class.sm:w-[calc(50%-1rem)]]="!marquee()"
              [class.lg:w-[calc(33.333%-1rem)]]="!marquee()"
              [class.xl:w-[calc(25%-1rem)]]="!marquee()"
            >
              <ng-container
                *ngTemplateOutlet="
                  itemTemplate() || defaultTemplate;
                  context: { $implicit: item, index: i }
                "
              ></ng-container>
            </div>
          }
        }

        <div class="w-1 flex-shrink-0 sm:hidden"></div>
      </div>

      <div
        class="pointer-events-none absolute top-0 right-0 bottom-10 hidden w-24 bg-gradient-to-l from-slate-50 to-transparent opacity-50 sm:block dark:from-slate-950"
      ></div>
      @if (marquee()) {
        <div
          class="pointer-events-none absolute top-0 bottom-10 left-0 hidden w-24 bg-gradient-to-r from-slate-50 to-transparent opacity-50 sm:block dark:from-slate-950"
        ></div>
      }
    </div>

    <ng-template #defaultTemplate let-item>
      <div class="rounded border p-4">{{ item }}</div>
    </ng-template>
  `,
  styles: [
    `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class CarouselComponent<T> implements OnDestroy {
  private snapTimeout: ReturnType<typeof setTimeout> | null = null;

  onWheel(event: WheelEvent) {
    const el = this.container()?.nativeElement;
    if (!el) return;

    const hasHorizontalOverflow = el.scrollWidth - el.clientWidth > 1;
    if (!hasHorizontalOverflow) return;

    // Keep native vertical page scrolling; only capture explicit horizontal wheel gestures.
    const isHorizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
    if (!isHorizontalGesture) return;

    let delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
    if (delta === 0) return;

    event.preventDefault();

    if (event.deltaMode === 1) {
      delta *= 40;
    }

    if (delta !== 0) {
      if (!this.marquee()) {
        el.style.scrollSnapType = 'none';

        if (this.snapTimeout) {
          clearTimeout(this.snapTimeout);
          this.snapTimeout = null;
        }

        this.snapTimeout = setTimeout(() => {
          el.style.scrollSnapType = '';
          this.snapTimeout = null;
        }, 150);
      }

      el.scrollLeft += delta;
    }
  }
  items = input.required<T[]>();
  itemTemplate = input<TemplateRef<{ $implicit: T; index: number }>>();
  autoplay = input(false);
  interval = input(4000);

  marquee = input(false);
  marqueeDuration = input('60s');

  container = viewChild<ElementRef>('scrollContainer');

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private rafId: number | null = null;
  protected isPaused = false;
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  // Only enable infinite scroll if we have enough items (e.g. > 3) or if it's a marquee
  enableInfiniteScroll = computed(() => this.items().length > 3 || this.marquee());

  constructor() {
    effect(() => {
      this.autoplay();
      this.marquee();
      this.items();
      this.container();

      if (this.container()) {
        setTimeout(() => this.initializeScroll(), 0);
      }

      setTimeout(() => this.start(), 0);
    });
  }

  trackByFn(index: number, item: T): string | number {
    return (item as { id?: string | number })?.id ?? index;
  }

  initializeScroll() {
    if (!this.enableInfiniteScroll()) return;

    const el = this.container()?.nativeElement;
    if (!el) return;
    el.scrollLeft = el.scrollWidth / 3;
  }

  onScroll() {
    if (!this.enableInfiniteScroll()) return;

    const el = this.container()?.nativeElement;
    if (!el) return;

    const totalWidth = el.scrollWidth;
    const setWidth = totalWidth / 3;
    const scrollLeft = el.scrollLeft;

    if (scrollLeft < setWidth - 50) {
      el.scrollLeft = scrollLeft + setWidth;
    } else if (scrollLeft > 2 * setWidth + 50) {
      el.scrollLeft = scrollLeft - setWidth;
    }
  }

  start() {
    this.stop();
    if (!isPlatformBrowser(this.platformId)) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    if (this.marquee()) {
      this.ngZone.runOutsideAngular(() => this.startMarquee());
    } else if (this.autoplay()) {
      this.ngZone.runOutsideAngular(() => {
        this.intervalId = setInterval(() => {
          this.ngZone.run(() => this.scrollNext());
        }, this.interval());
      });
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  startMarquee() {
    const animate = () => {
      if (!this.rafId) return;

      if (!this.isPaused && this.container()) {
        const el = this.container()!.nativeElement;
        const totalWidth = el.scrollWidth;
        const setWidth = totalWidth / 3;

        if (el.scrollLeft >= setWidth * 2.5) {
          el.scrollLeft -= setWidth;
        }

        el.scrollLeft += 1;
      }
      this.rafId = requestAnimationFrame(animate);
    };

    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(animate);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  scroll(direction: 'left' | 'right') {
    const el = this.container()?.nativeElement;
    if (!el) return;

    const firstItem = el.firstElementChild as HTMLElement;
    if (!firstItem) return;

    const itemWidth = firstItem.offsetWidth;
    const gap = 16;
    const step = itemWidth + gap;

    if (!this.enableInfiniteScroll()) {
      if (direction === 'right') {
        el.scrollBy({ left: step, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -step, behavior: 'smooth' });
      }
      return;
    }

    const W = el.scrollWidth / 3;

    if (direction === 'right') {
      if (el.scrollLeft >= 2 * W - step * 2) {
        el.scrollLeft -= W;
      }
      el.scrollBy({ left: step, behavior: 'smooth' });
    } else {
      if (el.scrollLeft <= W + step * 2) {
        el.scrollLeft += W;
      }
      el.scrollBy({ left: -step, behavior: 'smooth' });
    }
  }

  scrollNext() {
    if (this.isPaused) return;
    this.scroll('right');
  }

  ngOnDestroy() {
    this.stop();
  }
}
