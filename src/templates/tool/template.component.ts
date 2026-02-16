import { Component, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { ToastService } from '../../services/toast.service';
import { BubbleDirective } from '../../directives/bubble.directive';
import { ToolState } from '../../services/tool-state';
import { DbService } from '../../services/db.service';

import en from './i18n/en';
import fr from './i18n/fr';

@Component({
  selector: 'app-tool-template',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ToolLayoutComponent,
    BubbleDirective
  ],
  providers: [
    // 1. I18N: Register translations specific to this tool
    provideTranslation({
      en: () => en,
      fr: () => fr
    })
  ],
  template: `
    <!-- FULL PAGE MODE -->
    @if (!isWidget()) {
       <!-- 'toolId' must match the ID in metadata.json for SEO and Header to work -->
       <app-tool-layout toolId="my-new-tool">
         <ng-container *ngTemplateOutlet="mainContent"></ng-container>
       </app-tool-layout>
    } 
    <!-- WIDGET MODE -->
    @else {
       <!-- The container should handle h-full and basic styling -->
       <div class="h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative flex flex-col">
          
          <!-- Switch content based on widget size -->
          @switch (viewMode()) {
            
            <!-- 1x1: COMPACT -->
            @case ('compact') {
              <div class="flex-1 flex flex-col items-center justify-center p-2 text-center">
                 <span class="material-symbols-outlined text-2xl text-primary mb-1">construction</span>
                 <span class="text-[10px] font-bold uppercase text-slate-500 leading-tight">{{ t.map()['TITLE_SHORT'] }}</span>
              </div>
            }

            <!-- 2x1: WIDE -->
            @case ('wide') {
               <div class="h-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-2">
                  <span class="text-[10px] font-bold uppercase text-slate-500">{{ t.map()['TITLE'] }}</span>
               </div>
               <div class="flex-1 flex items-center justify-center gap-3 p-2">
                  <span class="material-symbols-outlined text-2xl text-primary">construction</span>
                  <div class="text-xs text-slate-600 dark:text-slate-300">Widget Content (Wide)</div>
               </div>
            }

            <!-- 1x2: TALL -->
            @case ('tall') {
               <div class="h-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-center">
                  <span class="text-[10px] font-bold uppercase text-slate-500">{{ t.map()['TITLE_SHORT'] }}</span>
               </div>
               <div class="flex-1 flex flex-col items-center justify-center gap-2 p-2">
                  <span class="material-symbols-outlined text-3xl text-primary">construction</span>
                  <div class="text-xs text-center text-slate-600 dark:text-slate-300">Tall Mode</div>
               </div>
            }

            <!-- DEFAULT / ERROR -->
            @default {
               <div class="flex items-center justify-center h-full text-xs text-slate-400">
                  {{ widgetConfig()?.['cols'] }}x{{ widgetConfig()?.['rows'] }}
               </div>
            }
          }
       </div>
    }

    <!-- SHARED CONTENT (Main Page Logic) -->
    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[400px]">
        <div class="text-center py-12 flex flex-col items-center gap-6">
          
          <span class="material-symbols-outlined text-5xl text-primary">construction</span>
          
          <div class="space-y-2">
            <h2 class="text-xl font-bold text-slate-700 dark:text-white">{{ t.map()['TITLE'] }}</h2>
            <p class="text-slate-500 max-w-md mx-auto">{{ t.map()['DESC'] }}</p>
          </div>

          <!-- EXAMPLE: Info Bubble Component Usage -->
          <!-- Use [appBubble] on any element to show a tooltip/help bubble -->
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-full text-sm text-slate-600 dark:text-slate-300">
             <span>How does this work?</span>
             <span 
                class="material-symbols-outlined text-lg text-slate-400 hover:text-primary cursor-help transition-colors"
                [appBubble]="'HELP_BUBBLE_TEXT'" 
                bubblePos="top"
             >help</span>
          </div>

          <!-- EXAMPLE: State Management & Toast -->
          <div class="p-6 border border-slate-100 dark:border-slate-700 rounded-xl flex flex-col gap-3">
             <div class="text-xs font-bold uppercase text-slate-400">State Demo</div>
             <div class="flex items-center gap-4">
                <button (click)="decrement()" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 flex items-center justify-center">
                   <span class="material-symbols-outlined text-sm">remove</span>
                </button>
                <span class="text-2xl font-mono font-bold w-12">{{ count() }}</span>
                <button (click)="increment()" class="w-8 h-8 rounded-full bg-primary text-white hover:opacity-90 flex items-center justify-center">
                   <span class="material-symbols-outlined text-sm">add</span>
                </button>
             </div>
          </div>

        </div>
      </div>
    </ng-template>
  `
})
export class ToolTemplateComponent {
  // -------------------------------------------------------------------------
  // 1. INPUTS (Injected by WidgetHost)
  // -------------------------------------------------------------------------
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null); // Contains { cols: number, rows: number }

  // -------------------------------------------------------------------------
  // 2. SERVICES
  // -------------------------------------------------------------------------
  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  db = inject(DbService);

  // -------------------------------------------------------------------------
  // 3. STATE MANAGEMENT
  // -------------------------------------------------------------------------
  // Use ToolState to automatically persist data to IndexedDB
  // 'template-tool' must be unique across the app (usually the tool ID)
  private state = new ToolState('template-tool', { count: 0 }, this.db);
  
  // Create readonly signals for the template
  count = this.state.select('count');

  // -------------------------------------------------------------------------
  // 4. WIDGET VIEW MODE
  // -------------------------------------------------------------------------
  viewMode = computed(() => {
    const config = this.widgetConfig();
    const cols = config?.['cols'] as number;
    const rows = config?.['rows'] as number;

    // Standard Sizes
    if (cols === 1 && rows === 1) return 'compact';
    if (cols === 2 && rows === 1) return 'wide';
    if (cols === 1 && rows === 2) return 'tall';
    
    return 'default';
  });

  // -------------------------------------------------------------------------
  // 5. ACTIONS
  // -------------------------------------------------------------------------
  increment() {
    this.state.update(s => ({ count: s.count + 1 }));
    // Example toast usage
    if (this.count() === 5) {
       this.toast.show('You successfully reached 5!', 'success');
    }
  }

  decrement() {
    this.state.update(s => ({ count: Math.max(0, s.count - 1) }));
  }
}
