
import { Component, inject, computed, signal, effect, untracked } from '@angular/core';
import { ToolService, ToolMetadata } from '../../services/tool.service';
import { ToolCardComponent } from '../tool-card/tool-card.component';
import { ArticleCardComponent } from '../article-card/article-card.component';
import { CarouselComponent } from '../carousel/carousel.component';
import { RouterLink } from '@angular/router';
import { AppComponent } from '../../app.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ToolCardComponent, ArticleCardComponent, CarouselComponent, RouterLink, NgTemplateOutlet, LocalLinkPipe],
  templateUrl: './dashboard.component.html',
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh
    })
  ]
})
export class DashboardComponent {
  toolService = inject(ToolService);
  app = inject(AppComponent);
  t = inject(ScopedTranslationService);

  favorites = this.toolService.favorites;
  favoriteTools = this.toolService.favoriteTools;
  mostUsedTools = this.toolService.mostUsedTools;
  categories = this.toolService.categories;

  randomTools = signal<ToolMetadata[]>([]);

  constructor() {
    effect(() => {
      const allTools = this.toolService.tools();
      if (untracked(this.randomTools).length === 0 && allTools.length > 0) {
        const shuffled = [...allTools].sort(() => 0.5 - Math.random());
        this.randomTools.set(shuffled.slice(0, 10));
      }
    }, { allowSignalWrites: true });
  }

  hasUserStats = computed(() => {
    return this.favoriteTools().length > 0 || this.mostUsedTools().length > 0;
  });

  toggleFav(id: string) {
    this.toolService.toggleFavorite(id);
  }

  isFav(id: string): boolean {
    return this.favorites().has(id);
  }
}
