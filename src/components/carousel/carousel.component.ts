import { Component, input, TemplateRef, ElementRef, viewChild, OnDestroy, effect } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div 
      class="relative group w-full"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
      (touchstart)="pause()"
      (touchend)="resume()"
    >
      <!-- Scroll Container -->
      <div 
        #scrollContainer
        class="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0"
        style="scrollbar-width: none; -ms-overflow-style: none;"
      >
        @for (item of items(); track trackByFn($index, item)) {
          <!-- 
             Mobile: snap-start (aligns left), w-[85%] (shows peek of next item)
             Desktop: responsive column widths
          -->
          <div class="snap-start flex-shrink-0 w-[85%] sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1rem)] transition-opacity duration-300">
            <ng-container *ngTemplateOutlet="itemTemplate() || defaultTemplate; context: { $implicit: item }"></ng-container>
          </div>
        }
        
        <!-- Spacer for mobile to ensure the last item has right spacing when scrolled to end -->
        <div class="w-1 flex-shrink-0 sm:hidden"></div>
      </div>

      <!-- Fade edges for visual cue on desktop -->
      <div class="hidden sm:block absolute top-0 bottom-6 right-0 w-24 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent pointer-events-none opacity-50"></div>
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
  itemTemplate = input<TemplateRef<any>>();
  autoplay = input(false);
  interval = input(4000);
  
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

    // Determine the scroll step based on the first item's width + gap
    const firstItem = el.firstElementChild as HTMLElement;
    if (!firstItem) return;

    const itemWidth = firstItem.offsetWidth;
    const gap = 16; // gap-4 is 1rem = 16px usually
    const step = itemWidth + gap;

    // Check if we are near the end
    // scrollLeft + clientWidth ~= scrollWidth
    const maxScroll = el.scrollWidth - el.clientWidth;
    
    // Allow a small buffer for float precision
    if (el.scrollLeft >= maxScroll - 10) {
      // Loop back to start
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      // Scroll to next
      el.scrollBy({ left: step, behavior: 'smooth' });
    }
  }

  ngOnDestroy() {
    this.stop();
  }
}