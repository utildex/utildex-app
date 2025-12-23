
import { Component, inject } from '@angular/core';
import { ToolService } from '../../services/tool.service';
import { ArticleService } from '../../services/article.service';
import { ToolCardComponent } from '../tool-card/tool-card.component';
import { ArticleCardComponent } from '../article-card/article-card.component'; // Import new card
import { CarouselComponent } from '../carousel/carousel.component';
import { RouterLink } from '@angular/router';
import { AppComponent } from '../../app.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ToolCardComponent, ArticleCardComponent, CarouselComponent, RouterLink],
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
  articleService = inject(ArticleService);
  app = inject(AppComponent);
  t = inject(ScopedTranslationService);

  featuredArticles = this.articleService.featuredArticles;
  favorites = this.toolService.favorites;
  favoriteTools = this.toolService.favoriteTools;
  mostUsedTools = this.toolService.mostUsedTools;
  categories = this.toolService.categories;

  toggleFav(id: string) {
    this.toolService.toggleFavorite(id);
  }

  isFav(id: string): boolean {
    return this.favorites().has(id);
  }
}
