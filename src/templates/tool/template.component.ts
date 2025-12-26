
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
    // 1. I18N: Register translations specific to this tool
    provideTranslation({
      en: () => en,
      fr: () => fr
    })
  ],
  template: `
    @if (!isWidget()) {
       <!-- FULL PAGE MODE -->
       <!-- 'toolId' must match the ID in metadata.json for SEO and Header to work -->
       <app-tool-layout toolId="my-new-tool">
         <ng-container *ngTemplateOutlet="mainContent"></ng-container>
       </app-tool-layout>
    } @else {
       <!-- WIDGET MODE -->
       <!-- Use 'widgetConfig()' to adapt to different grid sizes (cols/rows) -->
       <div class="h-full bg-white dark:bg-slate-800 rounded-xl p-4 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700">
          <span class="text-sm font-bold text-slate-700 dark:text-white">Widget Mode</span>
          <span class="text-xs text-slate-500">{{ widgetConfig()?.cols }}x{{ widgetConfig()?.rows }}</span>
       </div>
    }

    <!-- SHARED CONTENT -->
    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[400px]">
        <div class="text-center py-12">
          <!-- 2. STYLING: Use 'text-primary' to respect user's accent color theme -->
          <span class="material-symbols-outlined text-4xl text-primary mb-4">construction</span>
          
          <!-- 3. I18N: Use 't.map()' to access localized strings -->
          <h2 class="text-xl font-bold text-slate-700 dark:text-white">{{ t.map()['TITLE'] }}</h2>
          <p class="text-slate-500">{{ t.map()['DESC'] }}</p>
        </div>
      </div>
    </ng-template>
  `
})
export class ToolTemplateComponent {
  // 4. INPUTS: These are automatically injected by the WidgetHost
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null); // Contains { cols: number, rows: number }

  // 5. SERVICES: Inject the scoped translation service
  t = inject(ScopedTranslationService);
}
