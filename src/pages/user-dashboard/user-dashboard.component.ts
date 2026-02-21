
import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <div class="space-y-6 pb-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span class="material-symbols-outlined text-3xl text-primary">dashboard</span>
            {{ t.map()['TITLE'] }}
          </h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">{{ t.map()['DESC'] }}</p>
        </div>

        <div class="flex items-center gap-2">
          @if (isEditMode()) {
            <button 
              (click)="isEditMode.set(false); cancelPlacement()" 
              class="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-blue-600 transition-colors shadow-lg animate-fade-in"
            >
              {{ t.map()['BTN_DONE'] }}
            </button>
          } @else {
            <button 
              appTourTarget="tour-dashboard-edit"
              (click)="isEditMode.set(true)" 
              class="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
            >
              <span class="material-symbols-outlined text-lg">edit</span>
              {{ t.map()['BTN_EDIT'] }}
            </button>
          }
        </div>
      </div>

      <!-- Toolbar (Only in Edit Mode) -->
      @if (isEditMode() && !pendingPlacement()) {
        <div class="sticky top-4 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl flex gap-4 overflow-x-auto animate-fade-in-up items-center">
           <span class="text-xs font-bold text-slate-400 uppercase mr-2 shrink-0">{{ t.map()['LABEL_ADD'] }}</span>
           
           <button appTourTarget="tour-dashboard-add-widget" (click)="openAddModal()" class="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow hover:opacity-90 transition-opacity text-sm font-bold whitespace-nowrap">
              <span class="material-symbols-outlined">add_circle</span>
              {{ t.map()['BTN_ADD_TOOL'] }}
           </button>
           
           <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
           
           <button appTourTarget="tour-dashboard-add-filler" (click)="openFillerModal()" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-bold whitespace-nowrap">
              <span class="material-symbols-outlined">widgets</span>
              {{ t.map()['BTN_ADD_FILLER'] }}
           </button>
        </div>
      }

      <!-- Placement Message -->
      @if (pendingPlacement()) {
         <div class="sticky top-4 z-40 bg-primary/90 text-white backdrop-blur-md px-6 py-4 rounded-xl shadow-xl flex justify-between items-center animate-fade-in-up">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined animate-bounce">ads_click</span>
              <div>
                <p class="font-bold text-sm">{{ t.map()['MSG_PLACING'] }}</p>
                <p class="text-xs opacity-90">
                   {{ isMobile() ? t.map()['MSG_MOBILE_TAP'] : t.map()['MSG_DESKTOP_CLICK'] }}
                </p>
              </div>
            </div>
            <button (click)="cancelPlacement()" class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold">Cancel</button>
         </div>
      }

      <!-- Grid Canvas -->
      <div 
        #gridContainer
        class="relative w-full transition-all duration-300 overflow-hidden rounded-2xl"
        [ngClass]="{ 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]': dashboardWidgets().length === 0 }"
        [style.height.px]="containerHeight()"
        (mouseleave)="hoveredSlot.set(null)"
      >
         <!-- Empty State Hero -->
         @if (dashboardWidgets().length === 0 && !isEditMode()) {
            <div class="absolute inset-0 flex flex-col items-center justify-center -mt-20">
               <div class="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-full mb-6 border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                  <span class="material-symbols-outlined text-6xl text-slate-300">dashboard_customize</span>
               </div>
               <h3 class="text-xl font-bold text-slate-700 dark:text-slate-200 animate-fade-in-up delay-100">{{ t.map()['EMPTY_TITLE'] }}</h3>
               <p class="text-slate-500 mb-6 animate-fade-in-up delay-200">{{ t.map()['EMPTY_DESC'] }}</p>
               <button 
                  (click)="isEditMode.set(true)" 
                  class="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 animate-fade-in-up delay-300"
               >
                  {{ t.map()['BTN_START'] }}
               </button>
            </div>
         }

         <!-- Ghost Grid (Sensor Layer) -->
         @if (isEditMode()) {
            <div class="absolute inset-0 grid-container z-0">
               @for (row of ghostRows(); track row) {
                  @for (col of ghostCols(); track col) {
                     <div 
                        class="absolute border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200"
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
               class="absolute z-50 pointer-events-none transition-all duration-100 ease-out"
               [style.left.%]="hoveredSlot()!.x * (100 / cols)"
               [style.top.px]="hoveredSlot()!.y * rowHeight"
               [style.width.%]="pendingPlacement()!.w * (100 / cols)"
               [style.height.px]="pendingPlacement()!.h * rowHeight"
            >
               <div class="w-full h-full p-2 opacity-60 scale-95 origin-center">
                  <div class="w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-primary bg-white dark:bg-slate-900">
                     <!-- We recreate a temporary widget host for visual preview -->
                     <app-widget-host 
                        [widget]="getPhantomWidget()"
                        [isEditMode]="true"
                        [isPhantom]="true"
                        class="block w-full h-full pointer-events-none"
                     ></app-widget-host>
                  </div>
               </div>
            </div>
         }

         <!-- INVALID PLACEMENT INDICATOR (Red Box) -->
         @if (pendingPlacement() && hoveredSlot() && !isPositionValid()) {
             <div 
               class="absolute z-50 pointer-events-none transition-all duration-100 ease-out p-2"
               [style.left.%]="hoveredSlot()!.x * (100 / cols)"
               [style.top.px]="hoveredSlot()!.y * rowHeight"
               [style.width.%]="pendingPlacement()!.w * (100 / cols)"
               [style.height.px]="pendingPlacement()!.h * rowHeight"
            >
                <div class="w-full h-full rounded-2xl bg-red-500/20 border-2 border-red-500 flex items-center justify-center backdrop-blur-sm">
                   <span class="material-symbols-outlined text-red-500 text-4xl">block</span>
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
               <div class="relative w-full h-full group">
                  <app-widget-host 
                    [widget]="widget" 
                    [isEditMode]="isEditMode()"
                    class="block w-full h-full h-full shadow-sm"
                  ></app-widget-host>
                  
                  <!-- Edit Overlay with Buttons -->
                  @if (isEditMode() && !pendingPlacement()) {
                    <div class="absolute inset-0 z-30 bg-slate-900/10 dark:bg-white/5 backdrop-blur-[1px] border-2 border-primary/50 rounded-xl flex items-center justify-center gap-3 animate-fade-in opacity-0 group-hover:opacity-100 transition-opacity">
                        <!-- Move Button -->
                        <button 
                           (click)="pickupWidget(widget)" 
                           class="p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95 border border-slate-200 dark:border-slate-700"
                           [title]="t.map()['BTN_MOVE']"
                        >
                           <span class="material-symbols-outlined">open_with</span>
                        </button>

                        <!-- Delete Button -->
                        <button 
                           (click)="deleteWidget(widget.instanceId)" 
                           class="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 hover:scale-110 transition-all active:scale-95"
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
    </div>
  `
})
export class UserDashboardComponent {
  toolService = inject(ToolService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  tour = inject(TourService);

  isEditMode = signal(false);
  
  constructor() {
    effect(() => {
      if (this.tour.isActive()) {
        const step = this.tour.steps[this.tour.currentStepIndex()];
        if (step.id === 'tour-dashboard-add-widget' || step.id === 'tour-dashboard-add-filler') {
          this.isEditMode.set(true);
        } else if (step.id === 'tour-history' || step.id === 'tour-dashboard-edit') {
          this.isEditMode.set(false);
        }
      }
    }, { allowSignalWrites: true });

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

  // Placement State
  pendingPlacement = signal<PendingPlacement | null>(null);
  hoveredSlot = signal<{x: number, y: number} | null>(null);

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
        slot.x, slot.y, 
        pending.w, pending.h, 
        this.dashboardWidgets(),
        this.cols
    );
  });

  getPhantomWidget(): DashboardWidget {
     const pending = this.pendingPlacement()!;
     return {
        instanceId: 'phantom',
        type: pending.type,
        toolId: pending.toolId,
        data: pending.data,
        layout: { x: 0, y: 0, w: pending.w, h: pending.h }
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

      if (this.toolService.isPositionValid(col, row, pending.w, pending.h, this.dashboardWidgets(), this.cols)) {
          this.toolService.placeWidget({
              instanceId: crypto.randomUUID(),
              type: pending.type,
              toolId: pending.toolId,
              data: pending.data,
              layout: { x: col, y: row, w: pending.w, h: pending.h }
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

  isMobile(): boolean {
    return window.innerWidth < 768;
  }

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
      data: widget.data
    });
  }

  deleteWidget(id: string) {
    this.toolService.removeWidget(id);
    this.toast.show('Widget removed', 'info');
  }
}
