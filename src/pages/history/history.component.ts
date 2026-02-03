import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { ToolService } from '../../services/tool.service';
import { I18nService } from '../../services/i18n.service';
import { ToolCardComponent } from '../../components/tool-card/tool-card.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [ToolCardComponent, RouterLink, DatePipe, LocalLinkPipe],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh
    })
  ],
  template: `
    <div class="space-y-8">
      <div class="flex flex-col gap-2">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span class="material-symbols-outlined text-3xl text-slate-500">history</span>
          {{ t.map()['TITLE'] }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400">{{ t.map()['DESC'] }}</p>
      </div>

      @if (historyTools().length === 0) {
        <div class="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <span class="material-symbols-outlined text-5xl text-slate-300 mb-4">schedule</span>
          <p class="text-lg text-slate-500">{{ t.map()['NO_HISTORY_TITLE'] }}</p>
          <a [routerLink]="'/tools' | localLink" class="mt-4 inline-block text-primary hover:underline">{{ t.map()['BROWSE_LINK'] }}</a>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          @for (tool of historyTools(); track tool.id) {
             <div class="flex flex-col gap-2">
               <span class="text-xs font-mono text-slate-400 dark:text-slate-500 pl-1">
                 {{ t.map()['LAST_USED_PREFIX'] }} {{ toolService.getLastUsedDate(tool.id) | date:'medium' }}
               </span>
               <div class="flex-1">
                 <app-tool-card 
                   [tool]="tool" 
                   [isFavorite]="isFav(tool.id)" 
                   (toggleFavorite)="toggleFav($event)">
                 </app-tool-card>
               </div>
             </div>
          }
        </div>
      }
    </div>
  `
})
export class HistoryComponent {
  toolService = inject(ToolService);
  i18nService = inject(I18nService);
  t = inject(ScopedTranslationService);
  
  historyTools = this.toolService.historyTools;
  favorites = this.toolService.favorites;
  // Expose currentLang for date pipe if needed in the future, currently just using default
  currentLang = this.i18nService.currentLang;

  toggleFav(id: string) {
    this.toolService.toggleFavorite(id);
  }

  isFav(id: string): boolean {
    return this.favorites().has(id);
  }
}