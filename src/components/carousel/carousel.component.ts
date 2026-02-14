
import { Component, input, TemplateRef, ElementRef, viewChild, OnDestroy, effect, ChangeDetectionStrategy, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="relative group w-full"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
      (touchstart)="pause()"
      (touchend)="resume()"
    >
      <button 
        type="button"
        class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary hidden sm:flex items-center justify-center backdrop-blur-sm"
        (click)="scroll('left')"
        aria-label="Previous slide"
      >
        <span class="material-symbols-outlined text-2xl">chevron_left</span>
      </button>

      <button 
        type="button"
        class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary hidden sm:flex items-center justify-center backdrop-blur-sm"
        (click)="scroll('right')"
        aria-label="Next slide"
      >
        <span class="material-symbols-outlined text-2xl">chevron_right</span>
      </button>

      <div 
        #scrollContainer
        class="flex gap-4 overflow-x-auto py-10 scrollbar-hide -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0"
        [class.snap-x]="!marquee()"
        [class.snap-mandatory]="!marquee()"
        style="scrollbar-width: none; -ms-overflow-style: none;"
      >
        @for (item of items(); track trackByFn($index, item); let i = $index) {
          <div 
            class="snap-start flex-shrink-0 transition-opacity duration-300"
            [class.w-[300px]]="marquee()"
            [class.w-[85%]]="!marquee()"
            [class.sm:w-[calc(50%-1rem)]]="!marquee()"
            [class.lg:w-[calc(33.333%-1rem)]]="!marquee()"
            [class.xl:w-[calc(25%-1rem)]]="!marquee()"
          >
            <ng-container *ngTemplateOutlet="itemTemplate() || defaultTemplate; context: { $implicit: item, index: i }"></ng-container>
          </div>
        }

        @if (marquee()) {
          @for (item of items(); track trackByFn($index, item) + '_dup'; let i = $index) {
            <div 
              class="snap-start flex-shrink-0 w-[300px] transition-opacity duration-300"
            >
              <ng-container *ngTemplateOutlet="itemTemplate() || defaultTemplate; context: { $implicit: item, index: i }"></ng-container>
            </div>
          }
        }
        
        <div class="w-1 flex-shrink-0 sm:hidden"></div>
      </div>

      <!-- Fade edges -->
      <div class="hidden sm:block absolute top-0 bottom-10 right-0 w-24 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent pointer-events-none opacity-50"></div>
      @if (marquee()) {
         <div class="hidden sm:block absolute top-0 bottom-10 left-0 w-24 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent pointer-events-none opacity-50"></div>
      }
    </div>

    <ng-template #defaultTemplate let-item>
      <div class="p-4 border rounded">{{ item }}</div>
    </ng-template>
  `,
  styles: [`
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
  `]
})
export class CarouselComponent<T> implements OnDestroy {
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

  constructor() {
    effect(() => {
      this.autoplay();
      this.marquee();
      this.items();
      this.container();
      
      setTimeout(() => this.start(), 0);
    });
  }

  trackByFn(index: number, item: T): string | number {
    return (item as { id?: string | number })?.id ?? index;
  }

  start() {
    this.stop();
    if (!isPlatformBrowser(this.platformId)) return;

    // Respect reduced motion preference
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
        
        if (el.scrollLeft >= (el.scrollWidth / 2)) {
           el.scrollLeft = 0; 
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

    const maxScroll = el.scrollWidth - el.clientWidth;
    const currentScroll = el.scrollLeft;
    
    if (direction === 'right') {
      if (currentScroll >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    } else {
      if (currentScroll <= 10) {
        el.scrollTo({ left: maxScroll, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -step, behavior: 'smooth' });
      }
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
