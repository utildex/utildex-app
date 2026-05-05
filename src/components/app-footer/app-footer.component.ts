import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScopedTranslationService } from '../../core/i18n';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { AppConfigService } from '../../services/app-config.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, LocalLinkPipe],
  template: `
    <footer class="mt-auto border-t border-slate-200 py-6 dark:border-slate-800">
      <div
        class="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row"
      >
        <span>{{ t.map()['FOOTER_COPYRIGHT'] }}</span>
        <div class="flex flex-wrap justify-center gap-4 md:justify-end">
          <a
            [routerLink]="'/articles' | localLink"
            class="transition-colors hover:text-slate-900 dark:hover:text-white"
            >{{ t.map()['FOOTER_ARTICLES'] }}</a
          >
          <a
            [routerLink]="'/legal' | localLink"
            class="transition-colors hover:text-slate-900 dark:hover:text-white"
            >{{ t.map()['FOOTER_LEGAL'] }}</a
          >
          <a
            [routerLink]="'/privacy' | localLink"
            class="transition-colors hover:text-slate-900 dark:hover:text-white"
            >{{ t.map()['FOOTER_PRIVACY'] }}</a
          >
          <a
            [routerLink]="'/terms' | localLink"
            class="transition-colors hover:text-slate-900 dark:hover:text-white"
            >{{ t.map()['FOOTER_TERMS'] }}</a
          >
          <a
            [href]="appConfig.githubUrl"
            target="_blank"
            class="transition-colors hover:text-slate-900 dark:hover:text-white"
            >{{ t.map()['FOOTER_CONTRIBUTE'] }}</a
          >
        </div>
      </div>
    </footer>
  `,
})
export class AppFooterComponent {
  t = inject(ScopedTranslationService);
  appConfig = inject(AppConfigService);
}
