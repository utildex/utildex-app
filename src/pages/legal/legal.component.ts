import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh
    })
  ],
  template: `
    <div class="max-w-2xl mx-auto py-12 px-4 pb-20">
      <h1 class="text-3xl font-bold text-slate-900 dark:text-white text-center mb-12">
        {{ t.map()['TITLE'] }}
      </h1>

      <div class="space-y-12 text-slate-600 dark:text-slate-300">
          
          <section>
              <h2 class="text-lg font-semibold mb-3 text-slate-900 dark:text-white">{{ t.map()['PUBLISHER_TITLE'] }}</h2>
              <p>{{ t.map()['PUBLISHER_TEXT'] }}</p>
              <p class="mt-1">{{ t.map()['CONTACT'] }}</p>
          </section>

          <section>
              <h2 class="text-lg font-semibold mb-3 text-slate-900 dark:text-white">{{ t.map()['HOSTING_TITLE'] }}</h2>
              <p>{{ t.map()['HOSTING_TEXT'] }}</p>
          </section>

          <section>
              <h2 class="text-lg font-semibold mb-3 text-slate-900 dark:text-white">{{ t.map()['DIRECTOR_TITLE'] }}</h2>
              <p>{{ t.map()['DIRECTOR_NAME'] }}</p>
          </section>
          
          <hr class="border-slate-200 dark:border-slate-800" />

          <section>
              <p>{{ t.map()['ACCESS_TEXT'] }}</p>
          </section>

      </div>
    </div>
  `
})
export class LegalComponent {
  protected t = inject(ScopedTranslationService);
}
