import { Component, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolService, DashboardWidget, ToolMetadata, WidgetPreset } from '../../services/tool.service';
import { WidgetHostComponent } from '../../components/widget-host/widget-host.component';
import { I18nService } from '../../services/i18n.service';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

// Defines what we are currently trying to place
interface PendingPlacement {
  type: DashboardWidget['type'];
  toolId?: string;
  w: number;
  h: number;
  data?: any;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [WidgetHostComponent, CommonModule, FormsModule],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <div class="space-y-6 pb-40">
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
           
           <button (click)="openAddModal()" class="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow hover:opacity-90 transition-opacity text-sm font-bold whitespace-nowrap">
              <span class="material-symbols-outlined">add_circle</span>
              {{ t.map()['BTN_ADD_TOOL'] }}
           </button>
           
           <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
           
           <button (click)="openFillerModal.set(true)" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-bold whitespace-nowrap">
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
        class="relative w-full transition-all duration-300"
        [style.height.px]="containerHeight()"
      >
         <!-- Ghost Grid (Visible in Edit Mode) -->
         @if (isEditMode()) {
            <div class="absolute inset-0 grid-container z-0">
               @for (row of ghostRows(); track row) {
                  @for (col of ghostCols(); track col) {
                     <div 
                        class="absolute border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200 flex items-center justify-center cursor-pointer"
                        [class.hover:bg-primary]="$any(pendingPlacement())"
                        [class.hover:bg-opacity-20]="$any(pendingPlacement())"
                        [class.hover:border-primary]="$any(pendingPlacement())"
                        [style.left.%]="col * (100 / cols)"
                        [style.top.px]="row * rowHeight"
                        [style.width.%]="100 / cols"
                        [style.height.px]="rowHeight"
                        (click)="onSlotClick(col, row)"
                     >
                        @if (pendingPlacement()) {
                           <div class="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                        }
                     </div>
                  }
               }
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

      <!-- Modal: Add Tool -->
      @if (openAddModalSignal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="openAddModalSignal.set(false)"></div>
           <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-scale-in">
              <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-4">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white whitespace-nowrap">
                   @if (selectedToolForSize()) {
                     {{ t.map()['MODAL_SELECT_SIZE'] }}
                   } @else {
                     {{ t.map()['MODAL_TITLE'] }}
                   }
                </h3>
                
                @if (!selectedToolForSize()) {
                  <div class="relative flex-1">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input 
                      type="text" 
                      [(ngModel)]="searchQuery" 
                      [placeholder]="t.map()['SEARCH_PLACEHOLDER']"
                      class="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-500"
                      autoFocus
                    >
                  </div>
                }

                <button (click)="openAddModalSignal.set(false)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div class="flex-1 overflow-y-auto p-6">
                 
                 @if (selectedToolForSize(); as tool) {
                    <!-- Step 2: Select Size -->
                    <div class="flex flex-col gap-4">
                       <button (click)="selectedToolForSize.set(null)" class="text-sm text-slate-500 hover:text-primary flex items-center gap-1 self-start mb-2">
                          <span class="material-symbols-outlined text-sm">arrow_back</span> Back
                       </button>

                       <h4 class="font-bold text-slate-900 dark:text-white">{{ i18n.resolve(tool.name) }}</h4>
                       
                       <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          @for (preset of tool.widget!.presets; track $index) {
                             <button 
                               (click)="selectPreset(tool, preset)"
                               class="flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all group bg-slate-50 dark:bg-slate-800/50"
                             >
                                <!-- Visual Representation -->
                                <div 
                                  class="bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg group-hover:border-primary transition-colors relative"
                                  [style.width.px]="preset.cols * 40"
                                  [style.height.px]="preset.rows * 40"
                                >
                                   <!-- Simple Grid Lines -->
                                   <div class="absolute inset-0 opacity-10" 
                                        style="background-image: linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px); background-size: 50% 50%;"></div>
                                </div>
                                
                                <div class="text-center">
                                   <div class="font-bold text-slate-900 dark:text-white">{{ i18n.resolve(preset.label) }}</div>
                                   <div class="text-xs text-slate-500">{{ preset.cols }}x{{ preset.rows }}</div>
                                </div>
                             </button>
                          }
                       </div>
                    </div>

                 } @else {
                    <!-- Step 1: Select Tool -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       @if (widgetableTools().length === 0) {
                         <div class="col-span-full py-12 text-center text-slate-500">
                           <span class="material-symbols-outlined text-3xl mb-2 opacity-50">search_off</span>
                           <p>No widgets found matching "{{ searchQuery() }}"</p>
                         </div>
                       } @else {
                         @for (tool of widgetableTools(); track tool.id) {
                           <button 
                             (click)="onToolClick(tool)"
                             class="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all text-left group"
                           >
                             <div class="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-primary group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                               <span class="material-symbols-outlined text-2xl">{{ tool.icon }}</span>
                             </div>
                             <div>
                               <h4 class="font-bold text-slate-900 dark:text-white">{{ i18n.resolve(tool.name) }}</h4>
                               <div class="mt-2 flex gap-2">
                                 @if (tool.widget?.presets?.length) {
                                    <span class="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-primary">
                                       {{ tool.widget?.presets?.length }} {{ t.map()['SIZE_PREFIX'] }}
                                    </span>
                                 } @else {
                                    <span class="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                       {{ tool.widget?.defaultCols }}x{{ tool.widget?.defaultRows }}
                                    </span>
                                 }
                               </div>
                             </div>
                           </button>
                         }
                       }
                    </div>
                 }
              </div>
           </div>
        </div>
      }

      <!-- Modal: Add Filler -->
      @if (openFillerModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="openFillerModal.set(false)"></div>
           <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
              <div class="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ t.map()['MODAL_FILLER_TITLE'] }}</h3>
              </div>
              
              <div class="p-6 grid grid-cols-2 gap-4">
                 <!-- Note -->
                 <button (click)="startPlacing({ type: 'note', w: 1, h: 1 })" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors text-center">
                    <span class="material-symbols-outlined text-3xl text-yellow-600 mb-2">sticky_note_2</span>
                    <div class="font-bold text-slate-900 dark:text-white">Note (1x1)</div>
                 </button>

                 <!-- Large Note -->
                 <button (click)="startPlacing({ type: 'note', w: 2, h: 1 })" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors text-center">
                    <span class="material-symbols-outlined text-3xl text-yellow-600 mb-2">sticky_note_2</span>
                    <div class="font-bold text-slate-900 dark:text-white">Wide Note (2x1)</div>
                 </button>

                 <!-- Image -->
                 <button (click)="startPlacing({ type: 'image', w: 2, h: 2 })" class="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-center">
                    <span class="material-symbols-outlined text-3xl text-indigo-600 mb-2">image</span>
                    <div class="font-bold text-slate-900 dark:text-white">Image (2x2)</div>
                 </button>

                 <!-- Spacer -->
                 <button (click)="startPlacing({ type: 'spacer', w: 1, h: 1 })" class="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-center">
                    <span class="material-symbols-outlined text-3xl text-slate-400 mb-2">space_bar</span>
                    <div class="font-bold text-slate-900 dark:text-white">Spacer (1x1)</div>
                 </button>
              </div>
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-scale-in { animation: scaleIn 0.2s ease-out; }
    .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class UserDashboardComponent {
  toolService = inject(ToolService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);
  toast = inject(ToastService);

  isEditMode = signal(false);
  openAddModalSignal = signal(false); 
  openFillerModal = signal(false);
  searchQuery = signal('');
  
  // Selection State for Size Step
  selectedToolForSize = signal<ToolMetadata | null>(null);

  // Placement State
  pendingPlacement = signal<PendingPlacement | null>(null);

  // Layout Config
  rowHeight = 200; // px
  
  // Signals
  dashboardWidgets = this.toolService.dashboardWidgets;
  
  widgetableTools = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const all = this.toolService.tools().filter(t => t.widget?.supported);
    
    if (!query) return all;

    return all.filter(t => {
      const name = this.i18n.resolve(t.name).toLowerCase();
      const desc = this.i18n.resolve(t.description).toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  });

  // --- Dynamic Layout Calculations ---

  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  get cols() {
    return this.isMobile() ? 1 : 4;
  }

  // Calculate grid height based on widgets
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

  // Ghost Grid Helpers
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
    this.searchQuery.set('');
    this.selectedToolForSize.set(null); // Reset selection
    this.openAddModalSignal.set(true);
  }

  // Called when user clicks a tool in step 1
  onToolClick(tool: ToolMetadata) {
     const presets = tool.widget?.presets;
     
     if (presets && presets.length > 1) {
        // Go to step 2
        this.selectedToolForSize.set(tool);
     } else {
        // Immediate placement
        const cols = presets?.[0]?.cols || tool.widget?.defaultCols || 1;
        const rows = presets?.[0]?.rows || tool.widget?.defaultRows || 1;
        this.startPlacing({ type: 'tool', toolId: tool.id, w: cols, h: rows });
     }
  }

  // Called when user picks a size in step 2
  selectPreset(tool: ToolMetadata, preset: WidgetPreset) {
     this.startPlacing({ type: 'tool', toolId: tool.id, w: preset.cols, h: preset.rows });
  }

  startPlacing(config: PendingPlacement) {
    if (this.isMobile()) {
      config.w = 1; 
    }
    this.pendingPlacement.set(config);
    this.openAddModalSignal.set(false);
    this.openFillerModal.set(false);
    this.selectedToolForSize.set(null);
  }

  cancelPlacement() {
    this.pendingPlacement.set(null);
  }

  onSlotClick(x: number, y: number) {
    const pending = this.pendingPlacement();
    if (!pending) return;

    if (this.isMobile()) x = 0;

    if (x + pending.w > this.cols) {
       this.toast.show(this.t.get('ERR_BOUNDS'), 'error');
       return;
    }

    const valid = this.toolService.isPositionValid(x, y, pending.w, pending.h, this.dashboardWidgets());

    if (!valid) {
       this.toast.show(this.t.get('ERR_COLLISION'), 'error');
       return;
    }

    this.toolService.placeWidget({
       instanceId: crypto.randomUUID(),
       type: pending.type,
       toolId: pending.toolId,
       data: pending.data,
       layout: { x, y, w: pending.w, h: pending.h }
    });

    this.pendingPlacement.set(null);
    this.toast.show('Widget placed', 'success');
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