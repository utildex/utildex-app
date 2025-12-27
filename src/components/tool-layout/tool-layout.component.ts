
import { Component, input, inject, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToolService } from '../../services/tool.service';
import { I18nService } from '../../services/i18n.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-tool-layout',
  standalone: true,
  imports: [RouterLink],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <div class="max-w-5xl mx-auto">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center text-sm text-slate-500 font-medium">
        <a routerLink="/tools" class="hover:text-primary transition-colors flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">arrow_back</span>
          {{ t.map()['BACK_TO_TOOLS'] }}
        </a>
        <span class="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <span class="text-slate-900 dark:text-slate-200 truncate">{{ name() }}</span>
      </nav>

      @if (tool(); as tInfo) {
        <!-- Standardized Header -->
        <header class="mb-8 animate-fade-in">
           <div class="flex items-start justify-between gap-4">
             <div class="flex items-center gap-5">
               <div class="relative group">
                 <div class="absolute inset-0 bg-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 <div class="relative p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-primary">
                   <span class="material-symbols-outlined text-4xl">{{ tInfo.icon }}</span>
                 </div>
               </div>
               <div>
                 <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{{ name() }}</h1>
                 <p class="text-slate-500 dark:text-slate-400 mt-1 text-lg">{{ description() }}</p>
                 
                 <div class="flex flex-wrap gap-2 mt-3">
                   @for (cat of tInfo.categories; track cat) {
                     <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                       {{ toolService.getCategoryName(cat) }}
                     </span>
                   }
                   <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 font-mono">
                     v{{ tInfo.version }}
                   </span>
                 </div>
               </div>
             </div>

             <button 
               (click)="toggleFav()"
               class="flex-shrink-0 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary group"
               [class.text-yellow-400]="isFav()"
               [class.text-slate-300]="!isFav()"
               [class.dark:text-slate-600]="!isFav()"
               [attr.aria-label]="isFav() ? t.map()['REMOVE_FAV'] : t.map()['ADD_FAV']"
             >
               <span class="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform" [class.fill-current]="isFav()">star</span>
             </button>
           </div>
        </header>

        <!-- Tool Workspace -->
        <main class="animate-fade-in-up delay-100">
           <ng-content></ng-content>
        </main>
      }
    </div>
  `,
  styles: [`
    .fill-current { font-variation-settings: 'FILL' 1; }
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    .animate-fade-in-up { animation: fadeInUp 0.5s ease-out backwards; }
    .delay-100 { animation-delay: 100ms; }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ToolLayoutComponent {
  toolId = input.required<string>();
  toolService = inject(ToolService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);

  tool = computed(() => this.toolService.tools().find(t => t.id === this.toolId()));
  name = computed(() => this.tool() ? this.i18n.resolve(this.tool()!.name) : '');
  description = computed(() => this.tool() ? this.i18n.resolve(this.tool()!.description) : '');
  
  isFav = computed(() => this.toolService.favorites().has(this.toolId()));

  constructor() {
    effect(() => {
      const id = this.toolId();
      if (id) {
        // Track usage when tool is loaded
        this.toolService.trackToolUsage(id);
      }
    });
  }

  toggleFav() {
    this.toolService.toggleFavorite(this.toolId());
  }
}
