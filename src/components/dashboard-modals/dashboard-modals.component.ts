import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ToolService,
  ToolMetadata,
  WidgetPreset,
  PendingPlacement,
} from '../../services/tool.service';
import { I18nService } from '../../services/i18n.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
// Local translations for self-contained component
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-dashboard-modals',
  standalone: true,
  imports: [FormsModule],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <!-- Modal: Add Tool -->
    @if (toolService.addModalOpen()) {
      <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="close()"></div>
        <div
          class="glass-surface-strong animate-scale-in relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
        >
          <div
            class="flex items-center justify-between gap-4 border-b border-slate-100 p-6 dark:border-slate-800"
          >
            <h3 class="text-xl font-bold whitespace-nowrap text-slate-900 dark:text-white">
              @if (selectedToolForSize()) {
                {{ t.map()['MODAL_SELECT_SIZE'] }}
              } @else {
                {{ t.map()['MODAL_TITLE'] }}
              }
            </h3>

            @if (!selectedToolForSize()) {
              <div class="relative flex-1">
                <span
                  class="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400"
                  >search</span
                >
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  [placeholder]="t.map()['SEARCH_PLACEHOLDER']"
                  class="focus:ring-primary w-full rounded-lg border-none bg-slate-100 py-2 pr-4 pl-9 text-sm text-slate-900 placeholder-slate-500 focus:ring-2 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>
            }

            <button
              (click)="close()"
              aria-label="Close"
              class="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            @if (selectedToolForSize(); as tool) {
              <!-- Step 2: Select Size -->
              <div class="flex flex-col gap-4">
                <button
                  (click)="selectedToolForSize.set(null)"
                  class="hover:text-primary mb-2 flex items-center gap-1 self-start text-sm text-slate-500"
                >
                  <span class="material-symbols-outlined text-sm">arrow_back</span> Back
                </button>

                <h4 class="font-bold text-slate-900 dark:text-white">
                  {{ i18n.resolve(tool.name) }}
                </h4>

                <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  @for (preset of tool.widget?.presets ?? []; track $index) {
                    <button
                      (click)="selectPreset(tool, preset)"
                      class="hover:border-primary dark:hover:border-primary group flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <!-- Visual Representation -->
                      <div
                        class="group-hover:border-primary relative rounded-lg border-2 border-slate-300 bg-white transition-colors dark:border-slate-600 dark:bg-slate-700"
                        [style.width.px]="preset.cols * 40"
                        [style.height.px]="preset.rows * 40"
                      >
                        <div
                          class="absolute inset-0 opacity-10"
                          style="background-image: linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px); background-size: 50% 50%;"
                        ></div>
                      </div>

                      <div class="text-center">
                        <div class="font-bold text-slate-900 dark:text-white">
                          {{ i18n.resolve(preset.label) }}
                        </div>
                        <div class="text-xs text-slate-500">
                          {{ preset.cols }}x{{ preset.rows }}
                        </div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            } @else {
              <!-- Step 1: Select Tool -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                @if (widgetableTools().length === 0) {
                  <div class="col-span-full py-12 text-center text-slate-500">
                    <span class="material-symbols-outlined mb-2 text-3xl opacity-50"
                      >search_off</span
                    >
                    <p>No widgets found matching "{{ searchQuery() }}"</p>
                  </div>
                } @else {
                  @for (tool of widgetableTools(); track tool.id) {
                    <button
                      (click)="onToolClick(tool)"
                      class="hover:border-primary dark:hover:border-primary group flex items-start gap-4 rounded-xl border border-slate-200 p-4 text-left transition-all hover:shadow-md dark:border-slate-700"
                    >
                      <div
                        class="group-hover:text-primary rounded-lg bg-slate-100 p-3 text-slate-600 transition-colors group-hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700"
                      >
                        <span class="material-symbols-outlined text-2xl">{{ tool.icon }}</span>
                      </div>
                      <div>
                        <h4 class="font-bold text-slate-900 dark:text-white">
                          {{ i18n.resolve(tool.name) }}
                        </h4>
                        <div class="mt-2 flex gap-2">
                          <span
                            class="text-primary rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800"
                          >
                            {{ getSizeCount(tool) }} {{ t.map()['SIZE_PREFIX'] }}
                          </span>
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
        <div
          class="glass-surface-strong animate-scale-in relative w-full max-w-md overflow-hidden rounded-2xl"
        >
          <div
            class="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800"
          >
            <h3 class="text-xl font-bold text-slate-900 dark:text-white">
              {{ t.map()['MODAL_FILLER_TITLE'] }}
            </h3>
            <button
              (click)="close()"
              aria-label="Close"
              class="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4 p-6">
            <button
              (click)="submitPlacement({ type: 'note', w: 1, h: 1 })"
              class="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center transition-colors hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40"
            >
              <span class="material-symbols-outlined mb-2 text-3xl text-yellow-600"
                >sticky_note_2</span
              >
              <div class="font-bold text-slate-900 dark:text-white">
                {{ t.map()['FILLER_NOTE'] }}
              </div>
            </button>

            <button
              (click)="submitPlacement({ type: 'note', w: 2, h: 1 })"
              class="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center transition-colors hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40"
            >
              <span class="material-symbols-outlined mb-2 text-3xl text-yellow-600"
                >sticky_note_2</span
              >
              <div class="font-bold text-slate-900 dark:text-white">
                {{ t.map()['FILLER_NOTE_WIDE'] }}
              </div>
            </button>

            <button
              (click)="submitPlacement({ type: 'image', w: 2, h: 2 })"
              class="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40"
            >
              <span class="material-symbols-outlined mb-2 text-3xl text-indigo-600">image</span>
              <div class="font-bold text-slate-900 dark:text-white">
                {{ t.map()['FILLER_IMAGE'] }}
              </div>
            </button>

            <button
              (click)="submitPlacement({ type: 'spacer', w: 1, h: 1 })"
              class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <span class="material-symbols-outlined mb-2 text-3xl text-slate-400">space_bar</span>
              <div class="font-bold text-slate-900 dark:text-white">
                {{ t.map()['FILLER_SPACER'] }}
              </div>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .animate-scale-in {
        animation: scaleIn 0.2s ease-out;
      }
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `,
  ],
})
export class DashboardModalsComponent {
  toolService = inject(ToolService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);

  searchQuery = signal('');
  selectedToolForSize = signal<ToolMetadata | null>(null);

  widgetableTools = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const all = this.toolService.tools().filter((t) => t.widget?.supported);

    if (!query) return all;

    return all.filter((t) => {
      const name = this.i18n.resolve(t.name).toLowerCase();
      const desc = this.i18n.resolve(t.description).toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  });

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

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

  getSizeCount(tool: ToolMetadata): number {
    const presets = tool.widget?.presets;
    return presets && presets.length > 0 ? presets.length : 1;
  }

  submitPlacement(p: PendingPlacement) {
    this.toolService.requestPlacement(p);
    // Cleanup local state
    this.searchQuery.set('');
    this.selectedToolForSize.set(null);
  }
}
