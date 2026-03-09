import { Component, inject, signal, computed, ElementRef, viewChild, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToolService } from '../../services/tool.service';
import { ThemeService } from '../../services/theme.service';
import { ShortcutService } from '../../services/shortcut.service';
import { I18nService } from '../../services/i18n.service';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface CommandResult {
  id: string;
  type: 'tool' | 'action' | 'smart';
  icon: string;
  title: string;
  subtitle?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [FormsModule],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[20vh]">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" (click)="close()"></div>

        <!-- Palette -->
        <div
          class="glass-surface animate-scale-in relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl"
        >
          <!-- Search Input -->
          <div class="flex items-center border-b border-slate-100 px-4 dark:border-slate-800">
            <span class="material-symbols-outlined text-xl text-slate-400">search</span>
            <input
              #searchInput
              type="text"
              [(ngModel)]="query"
              (ngModelChange)="selectedIndex.set(0)"
              [placeholder]="t.map()['PLACEHOLDER']"
              class="w-full border-none bg-transparent px-4 py-4 text-lg text-slate-900 placeholder-slate-400 focus:ring-0 focus:outline-none dark:text-white"
              autocomplete="off"
            />
            <div class="flex gap-2">
              <button
                (click)="toggleFilters()"
                class="flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
                [class.bg-slate-100]="isFilterOpen()"
                [class.text-slate-900]="isFilterOpen()"
                [class.text-slate-500]="!isFilterOpen()"
                [class.border-slate-200]="!isFilterOpen()"
                [class.border-slate-300]="isFilterOpen()"
                [class.dark:bg-slate-800]="isFilterOpen()"
                [class.dark:text-white]="isFilterOpen()"
                [class.dark:border-slate-700]="!isFilterOpen()"
                [class.dark:border-slate-600]="isFilterOpen()"
              >
                <span class="material-symbols-outlined text-[16px]">tune</span>
                <span class="hidden sm:inline">{{ t.map()['FILTER_BTN'] }}</span>
              </button>
              <span
                class="flex items-center rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-400 dark:border-slate-700"
                >Esc</span
              >
            </div>
          </div>

          <!-- Filters & Sorting (Collapsible) -->
          @if (isFilterOpen()) {
            <div
              class="glass-subsection animate-fade-in flex flex-col gap-3 border-b p-3"
            >
              <!-- Categories -->
              <div class="flex flex-wrap gap-2">
                <button
                  (click)="selectedCategory.set(null)"
                  class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  [class.bg-slate-900]="selectedCategory() === null"
                  [class.text-white]="selectedCategory() === null"
                  [class.border-slate-900]="selectedCategory() === null"
                  [class.bg-white]="selectedCategory() !== null"
                  [class.text-slate-600]="selectedCategory() !== null"
                  [class.border-slate-200]="selectedCategory() !== null"
                  [class.dark:bg-white]="selectedCategory() === null"
                  [class.dark:text-slate-900]="selectedCategory() === null"
                  [class.dark:border-white]="selectedCategory() === null"
                  [class.dark:bg-slate-800]="selectedCategory() !== null"
                  [class.dark:text-slate-300]="selectedCategory() !== null"
                  [class.dark:border-slate-700]="selectedCategory() !== null"
                >
                  {{ t.map()['CAT_ALL'] }}
                </button>
                @for (cat of categories(); track cat) {
                  <button
                    (click)="selectedCategory.set(cat)"
                    class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                    [class.bg-slate-900]="selectedCategory() === cat"
                    [class.text-white]="selectedCategory() === cat"
                    [class.border-slate-900]="selectedCategory() === cat"
                    [class.bg-white]="selectedCategory() !== cat"
                    [class.text-slate-600]="selectedCategory() !== cat"
                    [class.border-slate-200]="selectedCategory() !== cat"
                    [class.dark:bg-white]="selectedCategory() === cat"
                    [class.dark:text-slate-900]="selectedCategory() === cat"
                    [class.dark:border-white]="selectedCategory() === cat"
                    [class.dark:bg-slate-800]="selectedCategory() !== cat"
                    [class.dark:text-slate-300]="selectedCategory() !== cat"
                    [class.dark:border-slate-700]="selectedCategory() !== cat"
                  >
                    {{ toolService.getCategoryName(cat) }}
                  </button>
                }
              </div>

              <!-- Sorting -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <span>{{ t.map()['SORT_BY'] }}:</span>
                  <button
                    (click)="sortBy.set('relevance')"
                    [class.font-bold]="sortBy() === 'relevance'"
                    [class.text-primary]="sortBy() === 'relevance'"
                  >
                    {{ t.map()['SORT_RELEVANCE'] }}
                  </button>
                  <span class="text-slate-300">|</span>
                  <button
                    (click)="sortBy.set('name')"
                    [class.font-bold]="sortBy() === 'name'"
                    [class.text-primary]="sortBy() === 'name'"
                  >
                    {{ t.map()['SORT_NAME'] }}
                  </button>
                </div>

                @if (selectedCategory() || sortBy() !== 'relevance') {
                  <button (click)="resetFilters()" class="text-xs text-red-500 hover:underline">
                    {{ t.map()['RESET_FILTERS'] }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Results -->
          <div class="max-h-[60vh] overflow-y-auto p-2">
            @if (results().length === 0) {
              <div class="py-12 text-center text-slate-500">
                <span class="material-symbols-outlined mb-2 text-3xl opacity-50">search_off</span>
                <p>{{ t.map()['NO_RESULTS'] }}</p>
              </div>
            } @else {
              @for (result of results(); track result.id; let i = $index) {
                <button
                  (click)="execute(result)"
                  (mouseenter)="selectedIndex.set(i)"
                  class="group flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
                  [class.bg-slate-100]="i === selectedIndex()"
                  [class.dark:bg-slate-800]="i === selectedIndex()"
                >
                  <div
                    class="group-hover:text-primary rounded-lg bg-white p-2 text-slate-500 shadow-sm transition-colors dark:bg-slate-700"
                    [class.text-primary]="i === selectedIndex()"
                    [class.text-indigo-500]="result.type === 'smart'"
                  >
                    <span class="material-symbols-outlined">{{ result.icon }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <h4 class="truncate font-semibold text-slate-900 dark:text-white">
                      {{ result.title }}
                    </h4>
                    <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                      {{ result.subtitle }}
                    </p>
                  </div>
                  @if (i === selectedIndex()) {
                    <span class="material-symbols-outlined animate-fade-in text-sm text-slate-400">
                      {{ result.type === 'smart' ? 'content_copy' : 'keyboard_return' }}
                    </span>
                  }
                </button>
              }
            }
          </div>

          <!-- Footer -->
          <div
            class="glass-subsection flex justify-end gap-3 border-t px-4 py-2 text-[10px] text-slate-400"
          >
            <span class="flex items-center gap-1"
              ><span class="font-bold">↑↓</span> {{ t.map()['HINT_NAVIGATE'] }}</span
            >
            <span class="flex items-center gap-1"
              ><span class="font-bold">↵</span> {{ t.map()['HINT_SELECT'] }}</span
            >
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .animate-scale-in {
        animation: scaleIn 0.1s ease-out;
      }
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.98);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `,
  ],
})
export class CommandPaletteComponent {
  isOpen = signal(false);
  query = signal('');
  selectedIndex = signal(0);

  isFilterOpen = signal(false);
  selectedCategory = signal<string | null>(null);
  sortBy = signal<'relevance' | 'name'>('relevance');

  inputRef = viewChild<ElementRef>('searchInput');

  toolService = inject(ToolService);
  themeService = inject(ThemeService);
  router: Router = inject(Router);
  shortcuts = inject(ShortcutService);
  i18n = inject(I18nService);
  clipboard = inject(ClipboardService);
  t = inject(ScopedTranslationService);

  categories = computed(() => {
    const cats = new Set<string>();
    this.toolService.tools().forEach((tool) => {
      tool.categories.forEach((c) => cats.add(c));
    });
    return Array.from(cats).sort();
  });

  results = computed(() => {
    const q = this.query().toLowerCase();
    const list: CommandResult[] = [];
    const cat = this.selectedCategory();
    const sort = this.sortBy();

    const actions: CommandResult[] = [
      {
        id: 'act-home',
        type: 'action',
        icon: 'home',
        title: this.t.map()['ACT_HOME'],
        subtitle: 'Navigation',
        action: () => this.router.navigate(['/', this.i18n.currentLang()]),
      },
      {
        id: 'act-theme',
        type: 'action',
        icon: 'contrast',
        title: this.t.map()['ACT_THEME'],
        subtitle: 'Appearance',
        action: () => this.themeService.toggleTheme(),
      },
      {
        id: 'act-history',
        type: 'action',
        icon: 'history',
        title: this.t.map()['ACT_HISTORY'],
        subtitle: 'Clipboard',
        action: () => this.clipboard.clearHistory(),
      },
    ];

    if (!q && !cat) {
      list.push(...actions);
      return list;
    }

    if (!cat) {
      list.push(...actions.filter((a) => a.title.toLowerCase().includes(q)));
    }

    let tools = this.toolService.tools();

    if (cat) {
      tools = tools.filter((t) => t.categories.includes(cat));
    }

    const scoredTools = tools
      .map((tool) => {
        const name = this.i18n.resolve(tool.name).toLowerCase();
        const tags = tool.tags.join(' ');
        const desc = this.i18n.resolve(tool.description).toLowerCase();

        let score = 0;
        if (q) {
          if (name.startsWith(q)) score += 100;
          else if (name.includes(q)) score += 10;
          if (tags.includes(q)) score += 5;
          if (desc.includes(q)) score += 1;
        } else {
          score = 1;
        }

        return { tool, score, name };
      })
      .filter((item) => item.score > 0);

    if (sort === 'relevance') {
      scoredTools.sort((a, b) => b.score - a.score);
    } else {
      scoredTools.sort((a, b) => a.name.localeCompare(b.name));
    }

    const toolResults = scoredTools.map((item) => ({
      id: `tool-${item.tool.id}`,
      type: 'tool' as const,
      icon: item.tool.icon,
      title: this.i18n.resolve(item.tool.name),
      subtitle: this.i18n.resolve(item.tool.description),
      action: () => {
        const lang = this.i18n.currentLang();
        const path = (item.tool.routePath || '').split('/');
        this.router.navigate(['/', lang, ...path]);
      },
    }));

    list.push(...toolResults);

    return list.slice(0, 50);
  });

  constructor() {
    this.shortcuts.register('open-palette', {
      key: 'k',
      ctrlOrMeta: true,
      allowInInput: true,
      action: () => this.open(),
    });

    effect(() => {
      if (this.isOpen()) {
        this.shortcuts.register('palette-down', {
          key: 'ArrowDown',
          allowInInput: true,
          action: () => this.moveSelection(1),
        });
        this.shortcuts.register('palette-up', {
          key: 'ArrowUp',
          allowInInput: true,
          action: () => this.moveSelection(-1),
        });
        this.shortcuts.register('palette-enter', {
          key: 'Enter',
          allowInInput: true,
          action: () => this.selectCurrent(),
        });
        this.shortcuts.register('palette-esc', {
          key: 'Escape',
          allowInInput: true,
          action: () => this.close(),
        });

        setTimeout(() => this.inputRef()?.nativeElement.focus(), 50);
      } else {
        this.shortcuts.unregister('palette-down');
        this.shortcuts.unregister('palette-up');
        this.shortcuts.unregister('palette-enter');
        this.shortcuts.unregister('palette-esc');
      }
    });
  }

  toggleFilters() {
    this.isFilterOpen.update((v) => !v);
  }

  resetFilters() {
    this.selectedCategory.set(null);
    this.sortBy.set('relevance');
  }

  open() {
    this.query.set('');
    this.selectedIndex.set(0);
    this.isOpen.set(true);
    this.resetFilters();
    this.isFilterOpen.set(false);
  }

  close() {
    this.isOpen.set(false);
  }

  moveSelection(delta: number) {
    const len = this.results().length;
    if (len === 0) return;
    this.selectedIndex.update((i) => (i + delta + len) % len);
  }

  selectCurrent() {
    const list = this.results();
    const idx = this.selectedIndex();
    if (list[idx]) {
      this.execute(list[idx]);
    }
  }

  execute(result: CommandResult) {
    result.action();
    this.close();
  }
}
