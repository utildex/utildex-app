import { Component, inject, computed } from '@angular/core';
import { ToolService } from '../../services/tool.service';
import { ToolCardComponent } from '../tool-card/tool-card.component';
import { CarouselComponent } from '../carousel/carousel.component';
import { RouterLink } from '@angular/router';
import { AppComponent } from '../../app.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { TourTargetDirective } from '../../directives/tour-target.directive';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ToolCardComponent, CarouselComponent, RouterLink, LocalLinkPipe, TourTargetDirective],
  templateUrl: './dashboard.component.html',
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  host: { class: 'contents' },
})
export class DashboardComponent {
  toolService = inject(ToolService);
  app = inject(AppComponent);
  t = inject(ScopedTranslationService);

  favorites = this.toolService.favorites;
  favoriteTools = this.toolService.favoriteTools;
  mostUsedTools = this.toolService.mostUsedTools;

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
