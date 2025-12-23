
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
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" (click)="close()"></div>
        
        <!-- Palette -->
        <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-scale-in">
          
          <!-- Search Input -->
          <div class="flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
            <span class="material-symbols-outlined text-slate-400 text-xl">search</span>
            <input 
              #searchInput
              type="text" 
              [(ngModel)]="query" 
              (ngModelChange)="selectedIndex.set(0)"
              [placeholder]="t.map()['PLACEHOLDER']"
              class="w-full px-4 py-4 bg-transparent border-none focus:ring-0 text-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              autocomplete="off"
            >
            <div class="flex gap-2">
                <span class="text-xs border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-400">Esc</span>
            </div>
          </div>

          <!-- Results -->
          <div class="max-h-[60vh] overflow-y-auto p-2">
            @if (results().length === 0) {
              <div class="py-12 text-center text-slate-500">
                <span class="material-symbols-outlined text-3xl mb-2 opacity-50">search_off</span>
                <p>{{ t.map()['NO_RESULTS'] }}</p>
              </div>
            } @else {
              @for (result of results(); track result.id; let i = $index) {
                <button 
                  (click)="execute(result)"
                  (mouseenter)="selectedIndex.set(i)"
                  class="w-full text-left px-4 py-3 rounded-lg flex items-center gap-4 transition-colors group"
                  [class.bg-slate-100]="i === selectedIndex()"
                  [class.dark:bg-slate-800]="i === selectedIndex()"
                >
                  <div 
                    class="p-2 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-slate-500 group-hover:text-primary transition-colors"
                    [class.text-primary]="i === selectedIndex()"
                    [class.text-indigo-500]="result.type === 'smart'"
                  >
                    <span class="material-symbols-outlined">{{ result.icon }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-slate-900 dark:text-white truncate">{{ result.title }}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ result.subtitle }}</p>
                  </div>
                  @if (i === selectedIndex()) {
                    <span class="material-symbols-outlined text-slate-400 text-sm animate-fade-in">
                        {{ result.type === 'smart' ? 'content_copy' : 'keyboard_return' }}
                    </span>
                  }
                </button>
              }
            }
          </div>
          
          <!-- Footer -->
          <div class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-end gap-3">
             <span class="flex items-center gap-1"><span class="font-bold">↑↓</span> {{ t.map()['HINT_NAVIGATE'] }}</span>
             <span class="flex items-center gap-1"><span class="font-bold">↵</span> {{ t.map()['HINT_SELECT'] }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-scale-in { animation: scaleIn 0.1s ease-out; }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class CommandPaletteComponent {
  isOpen = signal(false);
  query = signal('');
  selectedIndex = signal(0);
  
  inputRef = viewChild<ElementRef>('searchInput');

  toolService = inject(ToolService);
  themeService = inject(ThemeService);
  router: Router = inject(Router);
  shortcuts = inject(ShortcutService);
  i18n = inject(I18nService);
  clipboard = inject(ClipboardService);
  t = inject(ScopedTranslationService);

  results = computed(() => {
    const q = this.query().toLowerCase();
    const list: CommandResult[] = [];

    // --- Smart Instant Actions ---
    // UUID
    if ('uuid'.includes(q) || 'guid'.includes(q)) {
        list.push({
            id: 'smart-uuid',
            type: 'smart',
            icon: 'fingerprint',
            title: this.t.map()['SMART_UUID_TITLE'],
            subtitle: this.t.map()['SMART_UUID_DESC'],
            action: () => this.clipboard.copy(crypto.randomUUID(), this.t.get('SRC_CMD_PALETTE'))
        });
    }
    // Password
    if ('password'.includes(q) || 'pwd'.includes(q) || 'pass'.includes(q)) {
        list.push({
            id: 'smart-pwd',
            type: 'smart',
            icon: 'key',
            title: this.t.map()['SMART_PWD_TITLE'],
            subtitle: this.t.map()['SMART_PWD_DESC'],
            action: () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
                let pwd = '';
                for(let i=0; i<16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                this.clipboard.copy(pwd, this.t.get('SRC_CMD_PALETTE'));
            }
        });
    }
    // Date/Time
    if ('time'.includes(q) || 'date'.includes(q) || 'now'.includes(q)) {
        const now = new Date();
        list.push({
            id: 'smart-iso',
            type: 'smart',
            icon: 'schedule',
            title: this.t.map()['SMART_ISO_TITLE'],
            subtitle: now.toISOString(),
            action: () => this.clipboard.copy(now.toISOString(), this.t.get('SRC_CMD_PALETTE'))
        });
    }

    // --- Static Actions ---
    const actions: CommandResult[] = [
      {
        id: 'act-home',
        type: 'action',
        icon: 'home',
        title: this.t.map()['ACT_HOME'],
        subtitle: 'Navigation',
        action: () => this.router.navigate(['/'])
      },
      {
        id: 'act-theme',
        type: 'action',
        icon: 'contrast',
        title: this.t.map()['ACT_THEME'],
        subtitle: 'Appearance',
        action: () => this.themeService.toggleTheme()
      },
      {
        id: 'act-history',
        type: 'action',
        icon: 'history',
        title: this.t.map()['ACT_HISTORY'],
        subtitle: 'Clipboard',
        action: () => this.clipboard.clearHistory()
      }
    ];

    if (!q) {
      list.push(...actions);
    } else {
      list.push(...actions.filter(a => a.title.toLowerCase().includes(q)));
    }

    // --- Tools ---
    const tools = this.toolService.tools();
    const matchingTools = tools.filter(tool => {
      const name = this.i18n.resolve(tool.name).toLowerCase();
      const tags = tool.tags.join(' ');
      return name.includes(q) || tags.includes(q);
    }).map(tool => ({
      id: `tool-${tool.id}`,
      type: 'tool' as const,
      icon: tool.icon,
      title: this.i18n.resolve(tool.name),
      subtitle: this.i18n.resolve(tool.description),
      action: () => this.router.navigate([tool.routePath])
    }));

    list.push(...matchingTools);

    return list.slice(0, 10);
  });

  constructor() {
    this.shortcuts.register('open-palette', {
      key: 'k',
      ctrlOrMeta: true,
      allowInInput: true,
      action: () => this.open()
    });

    effect(() => {
      if (this.isOpen()) {
        this.shortcuts.register('palette-down', {
          key: 'ArrowDown',
          allowInInput: true,
          action: () => this.moveSelection(1)
        });
        this.shortcuts.register('palette-up', {
          key: 'ArrowUp',
          allowInInput: true,
          action: () => this.moveSelection(-1)
        });
        this.shortcuts.register('palette-enter', {
          key: 'Enter',
          allowInInput: true,
          action: () => this.selectCurrent()
        });
        this.shortcuts.register('palette-esc', {
          key: 'Escape',
          allowInInput: true,
          action: () => this.close()
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

  open() {
    this.query.set('');
    this.selectedIndex.set(0);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  moveSelection(delta: number) {
    const len = this.results().length;
    if (len === 0) return;
    this.selectedIndex.update(i => (i + delta + len) % len);
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
