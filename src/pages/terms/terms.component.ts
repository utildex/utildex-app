import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  template: `
    <div class="mx-auto max-w-2xl px-4 py-12 pb-20">
      <h1 class="mb-12 text-center text-3xl font-bold text-slate-900 dark:text-white">
        {{ t.map()['TITLE'] }}
      </h1>

      <div class="space-y-8 leading-relaxed text-slate-600 dark:text-slate-300">
        <p>{{ t.map()['INTRO'] }}</p>
        <p>{{ t.map()['LIABILITY'] }}</p>
        <p>{{ t.map()['RESPONSIBILITY'] }}</p>
      </div>
    </div>
  `,
})
export class TermsComponent {
  protected t = inject(ScopedTranslationService);
}
