import { Component, inject, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolService, DashboardWidget, PendingPlacement } from '../../services/tool.service';
import { WidgetHostComponent } from '../../components/widget-host/widget-host.component';
import { I18nService } from '../../services/i18n.service';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { TourTargetDirective } from '../../directives/tour-target.directive';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

import { TourService } from '../../services/tour.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [WidgetHostComponent, CommonModule, FormsModule, TourTargetDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <div class="space-y-6 pb-8">
      <!-- Header -->
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 class="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
            <span class="material-symbols-outlined text-primary text-3xl">dashboard</span>
            {{ t.map()['TITLE'] }}
          </h1>
          <p class="mt-1 text-slate-500 dark:text-slate-400">{{ t.map()['DESC'] }}</p>
        </div>

        <div class="flex items-center gap-2">
          @if (isEditMode()) {
            <button
              (click)="isEditMode.set(false); cancelPlacement()"
              class="bg-primary animate-fade-in rounded-xl px-6 py-2 text-sm font-bold text-white shadow-lg transition-colors hover:bg-blue-600"
            >
              {{ t.map()['BTN_DONE'] }}
            </button>
          } @else if (!isMobile()) {
            <button
              appTourTarget="tour-dashboard-edit"
              (click)="isEditMode.set(true)"
              class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span class="material-symbols-outlined text-lg">edit</span>
              {{ t.map()['BTN_EDIT'] }}
            </button>
          }
        </div>
      </div>

      <!-- Toolbar (Only in Edit Mode) -->
      @if (isEditMode() && !pendingPlacement() && !isMobile()) {
        <div
          class="animate-fade-in-up sticky top-4 z-40 flex items-center gap-4 overflow-x-auto rounded-xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90"
        >
          <span class="mr-2 shrink-0 text-xs font-bold text-slate-400 uppercase">{{
            t.map()['LABEL_ADD']
          }}</span>

          <button
            appTourTarget="tour-dashboard-add-widget"
            (click)="openAddModal()"
            class="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow transition-opacity hover:opacity-90 dark:bg-white dark:text-slate-900"
          >
            <span class="material-symbols-outlined">add_circle</span>
            {{ t.map()['BTN_ADD_TOOL'] }}
          </button>

          <div class="mx-2 h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

          <button
            appTourTarget="tour-dashboard-add-filler"
            (click)="openFillerModal()"
            class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span class="material-symbols-outlined">widgets</span>
            {{ t.map()['BTN_ADD_FILLER'] }}
          </button>
        </div>
      }

      @if (isMobile()) {
        <div
          class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-20 text-center dark:border-slate-800 dark:bg-slate-900/50"
        >
          <div
            class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 shadow-sm dark:bg-slate-800"
          >
            <span class="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500"
              >desktop_windows</span
            >
          </div>
          <h3 class="mb-2 text-xl font-bold text-slate-800 dark:text-white">
            {{ t.map()['UNAVAILABLE_TITLE'] || 'Not Available' }}
          </h3>
          <p class="mx-auto max-w-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {{ t.map()['DASHBOARD_MOBILE_UNAVAILABLE'] }}
          </p>
        </div>
      } @else {
        <!-- Placement Message -->
        @if (pendingPlacement()) {
          <div
            class="bg-primary/90 animate-fade-in-up sticky top-4 z-40 flex items-center justify-between rounded-xl px-6 py-4 text-white shadow-xl backdrop-blur-md"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined animate-bounce">ads_click</span>
              <div>
                <p class="text-sm font-bold">{{ t.map()['MSG_PLACING'] }}</p>
                <p class="text-xs opacity-90">
                  {{ isMobile() ? t.map()['MSG_MOBILE_TAP'] : t.map()['MSG_DESKTOP_CLICK'] }}
                </p>
              </div>
            </div>
            <button
              (click)="cancelPlacement()"
              class="rounded bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30"
            >
              Cancel
            </button>
          </div>
        }

        <!-- Grid Canvas -->
        <div
          #gridContainer
          class="relative w-full overflow-hidden rounded-2xl transition-all duration-300"
          [ngClass]="{
            'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]':
              dashboardWidgets().length === 0,
          }"
          [style.height.px]="containerHeight()"
          (mouseleave)="hoveredSlot.set(null)"
        >
          <!-- Empty State Hero -->
          @if (dashboardWidgets().length === 0 && !isEditMode() && !isMobile()) {
            <div class="absolute inset-0 -mt-20 flex flex-col items-center justify-center">
              <div
                class="animate-fade-in-up mb-6 rounded-full border border-slate-100 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <span class="material-symbols-outlined text-6xl text-slate-300"
                  >dashboard_customize</span
                >
              </div>
              <h3
                class="animate-fade-in-up text-xl font-bold text-slate-700 delay-100 dark:text-slate-200"
              >
                {{ t.map()['EMPTY_TITLE'] }}
              </h3>
              <p class="animate-fade-in-up mb-6 text-slate-500 delay-200">
                {{ t.map()['EMPTY_DESC'] }}
              </p>
              <button
                (click)="isEditMode.set(true)"
                class="bg-primary shadow-primary/30 animate-fade-in-up rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-all delay-300 hover:scale-105 hover:bg-blue-600 active:scale-95"
              >
                {{ t.map()['BTN_START'] }}
              </button>
            </div>
          }

          <!-- Ghost Grid (Sensor Layer) -->
          @if (isEditMode()) {
            <div class="grid-container absolute inset-0 z-0">
              @for (row of ghostRows(); track row) {
                @for (col of ghostCols(); track col) {
                  <div
                    class="absolute rounded-xl border border-slate-200 transition-colors duration-200 dark:border-slate-800"
                    [style.left.%]="col * (100 / cols)"
                    [style.top.px]="row * rowHeight"
                    [style.width.%]="100 / cols"
                    [style.height.px]="rowHeight"
                    (mouseenter)="onSlotMouseEnter(col, row)"
                    (click)="onSlotClick(col, row)"
                  ></div>
                }
              }
            </div>
          }

          <!-- THE PHANTOM WIDGET (Overlay) -->
          @if (pendingPlacement() && hoveredSlot() && isPositionValid()) {
            <div
              class="pointer-events-none absolute z-50 transition-all duration-100 ease-out"
              [style.left.%]="hoveredSlot()!.x * (100 / cols)"
              [style.top.px]="hoveredSlot()!.y * rowHeight"
              [style.width.%]="pendingPlacement()!.w * (100 / cols)"
              [style.height.px]="pendingPlacement()!.h * rowHeight"
            >
              <div class="h-full w-full origin-center scale-95 p-2 opacity-60">
                <div
                  class="border-primary h-full w-full overflow-hidden rounded-2xl border-2 bg-white shadow-2xl dark:bg-slate-900"
                >
                  <!-- We recreate a temporary widget host for visual preview -->
                  <app-widget-host
                    [widget]="getPhantomWidget()"
                    [isEditMode]="true"
                    [isPhantom]="true"
                    class="pointer-events-none block h-full w-full"
                  ></app-widget-host>
                </div>
              </div>
            </div>
          }

          <!-- INVALID PLACEMENT INDICATOR (Red Box) -->
          @if (pendingPlacement() && hoveredSlot() && !isPositionValid()) {
            <div
              class="pointer-events-none absolute z-50 p-2 transition-all duration-100 ease-out"
              [style.left.%]="hoveredSlot()!.x * (100 / cols)"
              [style.top.px]="hoveredSlot()!.y * rowHeight"
              [style.width.%]="pendingPlacement()!.w * (100 / cols)"
              [style.height.px]="pendingPlacement()!.h * rowHeight"
            >
              <div
                class="flex h-full w-full items-center justify-center rounded-2xl border-2 border-red-500 bg-red-500/20 backdrop-blur-sm"
              >
                <span class="material-symbols-outlined text-4xl text-red-500">block</span>
              </div>
            </div>
          }

          <!-- Widgets -->
          @for (widget of dashboardWidgets(); track widget.instanceId) {
            <div
              class="absolute p-2 transition-all duration-300"
              [style.left.%]="widget.layout.x * (100 / cols)"
              [style.top.px]="widget.layout.y * rowHeight"
              [style.width.%]="widget.layout.w * (100 / cols)"
              [style.height.px]="widget.layout.h * rowHeight"
              [class.z-10]="!isEditMode()"
              [class.z-20]="isEditMode()"
            >
              <div class="group relative h-full w-full">
                <app-widget-host
                  [widget]="widget"
                  [isEditMode]="isEditMode()"
                  class="block h-full w-full shadow-sm"
                ></app-widget-host>

                <!-- Edit Overlay with Buttons -->
                @if (isEditMode() && !pendingPlacement()) {
                  <div
                    class="border-primary/50 animate-fade-in absolute inset-0 z-30 flex items-center justify-center gap-3 rounded-xl border-2 bg-slate-900/10 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100 dark:bg-white/5"
                  >
                    <!-- Move Button -->
                    <button
                      (click)="pickupWidget(widget)"
                      class="rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-lg transition-transform hover:scale-110 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      [title]="t.map()['BTN_MOVE']"
                    >
                      <span class="material-symbols-outlined">open_with</span>
                    </button>

                    <!-- Delete Button -->
                    <button
                      (click)="deleteWidget(widget.instanceId)"
                      class="rounded-full bg-red-500 p-3 text-white shadow-lg transition-all hover:scale-110 hover:bg-red-600 active:scale-95"
                      [title]="t.map()['BTN_DELETE']"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class UserDashboardComponent {
  toolService = inject(ToolService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  tour = inject(TourService);
  platformId = inject(PLATFORM_ID);

  isEditMode = signal(false);
  isMobile = signal(false);
  private resizeListener?: () => void;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth < 768);
      this.resizeListener = () => this.isMobile.set(window.innerWidth < 768);
      window.addEventListener('resize', this.resizeListener);
    }

    effect(
      () => {
        if (this.tour.isActive()) {
          const step = this.tour.steps[this.tour.currentStepIndex()];
          if (step.id === 'tour-dashboard-add-widget' || step.id === 'tour-dashboard-add-filler') {
            this.isEditMode.set(true);
          } else if (step.id === 'tour-history' || step.id === 'tour-dashboard-edit') {
            this.isEditMode.set(false);
          }
        }
      },
      { allowSignalWrites: true },
    );

    // Listen for placement requests from the global modal
    effect(() => {
      const request = this.toolService.consumePlacementRequest();
      if (request) {
        if (this.isMobile()) {
          request.w = 1;
        }
        this.pendingPlacement.set(request);
      }
    });
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId) && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  // Placement State
  pendingPlacement = signal<PendingPlacement | null>(null);
  hoveredSlot = signal<{ x: number; y: number } | null>(null);

  // Layout Config
  rowHeight = 200; // px

  // Signals
  dashboardWidgets = this.toolService.dashboardWidgets;

  // Validation Check
  isPositionValid = computed(() => {
    const slot = this.hoveredSlot();
    const pending = this.pendingPlacement();
    if (!slot || !pending) return false;

    return this.toolService.isPositionValid(
      slot.x,
      slot.y,
      pending.w,
      pending.h,
      this.dashboardWidgets(),
      this.cols,
    );
  });

  getPhantomWidget(): DashboardWidget {
    const pending = this.pendingPlacement()!;
    return {
      instanceId: 'phantom',
      type: pending.type,
      toolId: pending.toolId,
      data: pending.data,
      layout: { x: 0, y: 0, w: pending.w, h: pending.h },
    };
  }

  onSlotMouseEnter(col: number, row: number) {
    if (this.pendingPlacement()) {
      this.hoveredSlot.set({ x: col, y: row });
    }
  }

  onSlotClick(col: number, row: number) {
    const pending = this.pendingPlacement();
    if (!pending) return;

    if (
      this.toolService.isPositionValid(
        col,
        row,
        pending.w,
        pending.h,
        this.dashboardWidgets(),
        this.cols,
      )
    ) {
      this.toolService.placeWidget({
        instanceId: crypto.randomUUID(),
        type: pending.type,
        toolId: pending.toolId,
        data: pending.data,
        layout: { x: col, y: row, w: pending.w, h: pending.h },
      });
      this.pendingPlacement.set(null);
      this.hoveredSlot.set(null);
      this.toast.show(this.t.get('MSG_SUCCESS'), 'success');
    } else {
      this.toast.show(this.t.get('MSG_COLLISION'), 'error');
    }
  }

  cancelPlacement() {
    this.pendingPlacement.set(null);
    this.hoveredSlot.set(null);
  }

  // --- Dynamic Layout Calculations ---

  get cols() {
    return this.isMobile() ? 1 : 4;
  }

  containerHeight = computed(() => {
    let maxRow = 5; // Min rows
    for (const w of this.dashboardWidgets()) {
      const bottom = w.layout.y + w.layout.h;
      if (bottom > maxRow) maxRow = bottom;
    }
    // Add extra buffer rows in edit mode
    if (this.isEditMode()) maxRow += 4;
    return maxRow * this.rowHeight;
  });

  ghostRows = computed(() => {
    const totalPx = this.containerHeight();
    const count = Math.ceil(totalPx / this.rowHeight);
    return Array.from({ length: count }, (_, i) => i);
  });

  ghostCols = computed(() => {
    return Array.from({ length: this.cols }, (_, i) => i);
  });

  // --- Actions ---

  openAddModal() {
    this.toolService.openAddToolModal();
  }

  openFillerModal() {
    this.toolService.openFillerModal();
  }

  pickupWidget(widget: DashboardWidget) {
    // Remove from board and set as pending (move operation)
    this.toolService.removeWidget(widget.instanceId);
    this.pendingPlacement.set({
      type: widget.type,
      toolId: widget.toolId,
      w: widget.layout.w,
      h: widget.layout.h,
      data: widget.data,
    });
  }

  deleteWidget(id: string) {
    this.toolService.removeWidget(id);
    this.toast.show('Widget removed', 'info');
  }
}
