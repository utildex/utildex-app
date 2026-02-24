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
  imports: [CommonModule, FormsModule, ToolLayoutComponent, BubbleDirective],
  providers: [
    // 1. I18N: Register translations specific to this tool
    provideTranslation({
      en: () => en,
      fr: () => fr,
    }),
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
      <div
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Switch content based on widget size -->
        @switch (viewMode()) {
          <!-- 1x1: COMPACT -->
          @case ('compact') {
            <div class="flex flex-1 flex-col items-center justify-center p-2 text-center">
              <span class="material-symbols-outlined text-primary mb-1 text-2xl">construction</span>
              <span class="text-[10px] leading-tight font-bold text-slate-500 uppercase">{{
                t.map()['TITLE_SHORT']
              }}</span>
            </div>
          }

          <!-- 2x1: WIDE -->
          @case ('wide') {
            <div
              class="flex h-6 items-center justify-between border-b border-slate-100 bg-slate-50 px-2 dark:border-slate-700 dark:bg-slate-900/50"
            >
              <span class="text-[10px] font-bold text-slate-500 uppercase">{{
                t.map()['TITLE']
              }}</span>
            </div>
            <div class="flex flex-1 items-center justify-center gap-3 p-2">
              <span class="material-symbols-outlined text-primary text-2xl">construction</span>
              <div class="text-xs text-slate-600 dark:text-slate-300">Widget Content (Wide)</div>
            </div>
          }

          <!-- 1x2: TALL -->
          @case ('tall') {
            <div
              class="flex h-6 items-center justify-center border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
            >
              <span class="text-[10px] font-bold text-slate-500 uppercase">{{
                t.map()['TITLE_SHORT']
              }}</span>
            </div>
            <div class="flex flex-1 flex-col items-center justify-center gap-2 p-2">
              <span class="material-symbols-outlined text-primary text-3xl">construction</span>
              <div class="text-center text-xs text-slate-600 dark:text-slate-300">Tall Mode</div>
            </div>
          }

          <!-- DEFAULT / ERROR -->
          @default {
            <div class="flex h-full items-center justify-center text-xs text-slate-400">
              {{ widgetConfig()?.['cols'] }}x{{ widgetConfig()?.['rows'] }}
            </div>
          }
        }
      </div>
    }

    <!-- SHARED CONTENT (Main Page Logic) -->
    <ng-template #mainContent>
      <div
        class="min-h-[400px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="flex flex-col items-center gap-6 py-12 text-center">
          <span class="material-symbols-outlined text-primary text-5xl">construction</span>

          <div class="space-y-2">
            <h2 class="text-xl font-bold text-slate-700 dark:text-white">{{ t.map()['TITLE'] }}</h2>
            <p class="mx-auto max-w-md text-slate-500">{{ t.map()['DESC'] }}</p>
          </div>

          <!-- EXAMPLE: Info Bubble Component Usage -->
          <!-- Use [appBubble] on any element to show a tooltip/help bubble -->
          <div
            class="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300"
          >
            <span>How does this work?</span>
            <span
              class="material-symbols-outlined hover:text-primary cursor-help text-lg text-slate-400 transition-colors"
              [appBubble]="'HELP_BUBBLE_TEXT'"
              bubblePos="top"
              >help</span
            >
          </div>

          <!-- EXAMPLE: State Management & Toast -->
          <div
            class="flex flex-col gap-3 rounded-xl border border-slate-100 p-6 dark:border-slate-700"
          >
            <div class="text-xs font-bold text-slate-400 uppercase">State Demo</div>
            <div class="flex items-center gap-4">
              <button
                (click)="decrement()"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700"
              >
                <span class="material-symbols-outlined text-sm">remove</span>
              </button>
              <span class="w-12 font-mono text-2xl font-bold">{{ count() }}</span>
              <button
                (click)="increment()"
                class="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-white hover:opacity-90"
              >
                <span class="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
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
    this.state.update((s) => ({ count: s.count + 1 }));
    // Example toast usage
    if (this.count() === 5) {
      this.toast.show('You successfully reached 5!', 'success');
    }
  }

  decrement() {
    this.state.update((s) => ({ count: Math.max(0, s.count - 1) }));
  }
}
