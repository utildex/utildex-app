import { Component, inject, computed } from '@angular/core';
import { ModuleService } from '../../services/modules/module.service';
import { ToolCardComponent } from '../tool-card/tool-card.component';
import { CarouselComponent } from '../carousel/carousel.component';
import { RouterLink } from '@angular/router';
import { AppComponent } from '../../apps/utildex/shell/app.component';
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
  moduleService = inject(ModuleService);
  app = inject(AppComponent);
  t = inject(ScopedTranslationService);

  favorites = this.moduleService.favorites;
  favoriteTools = this.moduleService.favoriteTools;
  mostUsedTools = this.moduleService.mostUsedTools;

  hasUserStats = computed(() => {
    return this.favoriteTools().length > 0 || this.mostUsedTools().length > 0;
  });

  toggleFav(id: string) {
    this.moduleService.toggleFavorite(id);
  }

  isFav(id: string): boolean {
    return this.favorites().has(id);
  }
}
