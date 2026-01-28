
import { Component, input, TemplateRef, ElementRef, viewChild, OnDestroy, effect } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    @if (marquee()) {
      <div 
        class="relative w-full overflow-hidden group"
        (mouseenter)="pause()"
        (mouseleave)="resume()"
        (touchstart)="pause()"
        (touchend)="resume()"
      >
        <!-- Marquee Track -->
        <div 
           class="flex gap-4 w-max py-10 marquee-track"
           [style.--marquee-duration]="marqueeDuration()"
           [class.paused]="isPaused"
        >
           <!-- Original Set -->
           @for (item of items(); track trackByFn($index, item); let i = $index) {
              <div class="flex-shrink-0 w-[300px]">
                 <ng-container *ngTemplateOutlet="itemTemplate() || defaultTemplate; context: { $implicit: item, index: i }"></ng-container>
              </div>
           }
           <!-- Duplicate Set for Loop -->
           @for (item of items(); track trackByFn($index, item) + '_dup'; let i = $index) {
              <div class="flex-shrink-0 w-[300px]">
                 <ng-container *ngTemplateOutlet="itemTemplate() || defaultTemplate; context: { $implicit: item, index: i }"></ng-container>
              </div>
           }
        </div>
        
        <!-- Fade Edges -->
        <div class="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent pointer-events-none z-10"></div>
        <div class="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent pointer-events-none z-10"></div>
      </div>
    } @else {
      <div 
        class="relative group w-full"
        (mouseenter)="pause()"
        (mouseleave)="resume()"
        (touchstart)="pause()"
        (touchend)="resume()"
      >
        <!-- Scroll Container -->
        <!-- Increased padding (py-10) to accommodate hover animations and shadows without clipping -->
        <div 
          #scrollContainer
          class="flex gap-4 overflow-x-auto py-10 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0"
          style="scrollbar-width: none; -ms-overflow-style: none;"
        >
          @for (item of items(); track trackByFn($index, item); let i = $index) {
            <!-- 
               Mobile: snap-start (aligns left), w-[85%] (shows peek of next item)
               Desktop: responsive column widths
            -->
            <div class="snap-start flex-shrink-0 w-[85%] sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1rem)] transition-opacity duration-300">
              <ng-container *ngTemplateOutlet="itemTemplate() || defaultTemplate; context: { $implicit: item, index: i }"></ng-container>
            </div>
          }
          
          <!-- Spacer for mobile to ensure the last item has right spacing when scrolled to end -->
          <div class="w-1 flex-shrink-0 sm:hidden"></div>
        </div>

        <!-- Fade edges for visual cue on desktop -->
        <div class="hidden sm:block absolute top-0 bottom-10 right-0 w-24 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent pointer-events-none opacity-50"></div>
      </div>
    }

    <ng-template #defaultTemplate let-item>
      <div class="p-4 border rounded">{{ item }}</div>
    </ng-template>
  `,
  styles: [`
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .marquee-track {
      animation: marquee var(--marquee-duration) linear infinite;
    }
    @keyframes marquee {
      0% { transform: translate3d(0, 0, 0); }
      100% { transform: translate3d(-50%, 0, 0); } 
    }
    .paused {
      animation-play-state: paused !important;
    }
  `]
})
export class CarouselComponent<T> implements OnDestroy {
  items = input.required<T[]>();
  itemTemplate = input<TemplateRef<any>>();
  autoplay = input(false);
  interval = input(4000);
  
  // Marquee Inputs
  marquee = input(false);
  marqueeDuration = input('60s');
  
  container = viewChild<ElementRef>('scrollContainer');

  private intervalId: any;
  private isPaused = false;

  constructor() {
    effect(() => {
      if (this.autoplay()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  trackByFn(index: number, item: any): any {
    return item?.id ?? item ?? index;
  }

  start() {
    this.stop();
    if (typeof window !== 'undefined') {
      this.intervalId = setInterval(() => this.scrollNext(), this.interval());
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  scrollNext() {
    if (this.isPaused) return;
    const el = this.container()?.nativeElement;
    if (!el) return;

    const firstItem = el.firstElementChild as HTMLElement;
    if (!firstItem) return;

    const itemWidth = firstItem.offsetWidth;
    const gap = 16; 
    const step = itemWidth + gap;

    const maxScroll = el.scrollWidth - el.clientWidth;
    
    if (el.scrollLeft >= maxScroll - 10) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: step, behavior: 'smooth' });
    }
  }

  ngOnDestroy() {
    this.stop();
  }
}
