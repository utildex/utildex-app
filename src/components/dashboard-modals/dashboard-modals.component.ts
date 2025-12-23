
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolService, ToolMetadata, WidgetPreset, PendingPlacement } from '../../services/tool.service';
import { I18nService } from '../../services/i18n.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
// Reusing dashboard translations as they contain the necessary keys
import en from '../../pages/user-dashboard/i18n/en';
import fr from '../../pages/user-dashboard/i18n/fr';
import es from '../../pages/user-dashboard/i18n/es';
import zh from '../../pages/user-dashboard/i18n/zh';

@Component({
  selector: 'app-dashboard-modals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <!-- Modal: Add Tool -->
    @if (toolService.addModalOpen()) {
      <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
         <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="close()"></div>
         <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
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

              <button (click)="close()" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
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
    @if (toolService.fillerModalOpen()) {
      <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
         <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="close()"></div>
         <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
            <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ t.map()['MODAL_FILLER_TITLE'] }}</h3>
              <button (click)="close()" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div class="p-6 grid grid-cols-2 gap-4">
               <button (click)="submitPlacement({ type: 'note', w: 1, h: 1 })" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors text-center">
                  <span class="material-symbols-outlined text-3xl text-yellow-600 mb-2">sticky_note_2</span>
                  <div class="font-bold text-slate-900 dark:text-white">{{ t.map()['FILLER_NOTE'] }}</div>
               </button>

               <button (click)="submitPlacement({ type: 'note', w: 2, h: 1 })" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors text-center">
                  <span class="material-symbols-outlined text-3xl text-yellow-600 mb-2">sticky_note_2</span>
                  <div class="font-bold text-slate-900 dark:text-white">{{ t.map()['FILLER_NOTE_WIDE'] }}</div>
               </button>

               <button (click)="submitPlacement({ type: 'image', w: 2, h: 2 })" class="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-center">
                  <span class="material-symbols-outlined text-3xl text-indigo-600 mb-2">image</span>
                  <div class="font-bold text-slate-900 dark:text-white">{{ t.map()['FILLER_IMAGE'] }}</div>
               </button>

               <button (click)="submitPlacement({ type: 'spacer', w: 1, h: 1 })" class="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-center">
                  <span class="material-symbols-outlined text-3xl text-slate-400 mb-2">space_bar</span>
                  <div class="font-bold text-slate-900 dark:text-white">{{ t.map()['FILLER_SPACER'] }}</div>
               </button>
            </div>
         </div>
      </div>
    }
  `,
  styles: [`
    .animate-scale-in { animation: scaleIn 0.2s ease-out; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class DashboardModalsComponent {
  toolService = inject(ToolService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);

  searchQuery = signal('');
  selectedToolForSize = signal<ToolMetadata | null>(null);

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

  close() {
    this.toolService.closeModals();
    this.searchQuery.set('');
    this.selectedToolForSize.set(null);
  }

  onToolClick(tool: ToolMetadata) {
     const presets = tool.widget?.presets;
     
     if (presets && presets.length > 1) {
        this.selectedToolForSize.set(tool);
     } else {
        const cols = presets?.[0]?.cols || tool.widget?.defaultCols || 1;
        const rows = presets?.[0]?.rows || tool.widget?.defaultRows || 1;
        this.submitPlacement({ type: 'tool', toolId: tool.id, w: cols, h: rows });
     }
  }

  selectPreset(tool: ToolMetadata, preset: WidgetPreset) {
     this.submitPlacement({ type: 'tool', toolId: tool.id, w: preset.cols, h: preset.rows });
  }

  submitPlacement(p: PendingPlacement) {
    this.toolService.requestPlacement(p);
    // Cleanup local state
    this.searchQuery.set('');
    this.selectedToolForSize.set(null);
  }
}
