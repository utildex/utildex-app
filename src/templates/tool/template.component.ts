import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';

@Component({
  selector: 'app-tool-template',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr
    })
  ],
  template: `
    @if (!isWidget()) {
       <app-tool-layout toolId="my-new-tool">
         <ng-container *ngTemplateOutlet="mainContent"></ng-container>
       </app-tool-layout>
    } @else {
       <!-- Widget Layout -->
       <div class="h-full bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-center">
          <span class="text-sm font-bold">Widget Mode</span>
       </div>
    }

    <ng-template #mainContent>
      <!-- Main Tool Layout -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[400px]">
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-4xl text-slate-300 mb-4">construction</span>
          <h2 class="text-xl font-bold text-slate-700 dark:text-white">{{ t.map()['TITLE'] }}</h2>
          <p class="text-slate-500">{{ t.map()['DESC'] }}</p>
        </div>
      </div>
    </ng-template>
  `
})
export class ToolTemplateComponent {
  isWidget = input<boolean>(false);
  t = inject(ScopedTranslationService);
}