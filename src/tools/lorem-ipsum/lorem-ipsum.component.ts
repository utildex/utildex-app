import { Component, signal, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-lorem-ipsum',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="lorem-ipsum">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700">
         <div class="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
             <div class="flex items-center gap-2">
               <span class="material-symbols-outlined text-lg text-slate-500">description</span>
               <span class="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Lorem Ipsum</span>
             </div>
             <input 
                type="number" 
                min="1" 
                max="5" 
                [(ngModel)]="count" 
                class="w-12 h-6 text-center text-sm border rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                title="Paragraphs"
             >
         </div>
         <div class="flex-1 p-3 overflow-y-auto text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-[150px]">
           {{ output()[0] }}
         </div>
         <div class="p-2 border-t border-slate-100 dark:border-slate-700 flex gap-2">
            <button (click)="generate()" class="flex-1 py-1.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 text-xs font-medium">
               {{ t.map()['BTN_GENERATE'] }}
            </button>
            <button (click)="copy()" class="flex-1 py-1.5 rounded bg-primary text-white hover:bg-blue-600 transition-colors text-xs font-medium">
               {{ t.map()['BTN_COPY'] }}
            </button>
         </div>
      </div>
    }

    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <!-- Toolbar -->
        <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div class="flex items-center gap-6 w-full sm:w-auto">
            <label class="flex flex-col text-xs font-bold text-slate-500 uppercase tracking-wider">
              {{ t.map()['LABEL_PARAGRAPHS'] }}
              <input 
                type="number" 
                min="1" 
                max="20" 
                [(ngModel)]="count" 
                class="mt-1 block w-24 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-slate-900 dark:text-white font-medium"
              >
            </label>
            
            <label class="flex items-center gap-3 cursor-pointer mt-5 select-none p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <input type="checkbox" [(ngModel)]="startWithLorem" class="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary">
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.map()['LABEL_START_LOREM'] }}</span>
            </label>
          </div>

          <div class="flex gap-3 w-full sm:w-auto">
            <button 
              (click)="generate()" 
              class="flex-1 sm:flex-none justify-center inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-95"
            >
              <span class="material-symbols-outlined text-lg mr-2">autorenew</span>
              {{ t.map()['BTN_GENERATE'] }}
            </button>
          </div>
        </div>

        <!-- Output -->
        <div class="p-8 bg-white dark:bg-slate-800 min-h-[300px]">
          @if (output().length > 0) {
            <div class="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              @for (para of output(); track $index) {
                <p class="mb-6 last:mb-0 leading-relaxed text-lg">{{ para }}</p>
              }
            </div>
          } @else {
            <div class="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <span class="material-symbols-outlined text-5xl mb-4 opacity-50">text_fields</span>
              <p class="text-lg">{{ t.map()['EMPTY_STATE'] }}</p>
            </div>
          }
        </div>

        <!-- Action Bar -->
        @if (output().length > 0) {
          <app-action-bar 
             [content]="resultString()" 
             filename="lorem-ipsum.txt" 
             source="Lorem Ipsum" 
             [allowPrint]="true"
          ></app-action-bar>
        }
      </div>
    </ng-template>
  `
})
export class LoremIpsumComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null);

  t = inject(ScopedTranslationService);
  clipboard = inject(ClipboardService);

  count = signal<number>(3);
  startWithLorem = signal<boolean>(true);
  output = signal<string[]>([]);

  // Computed string for export
  resultString = computed(() => this.output().join('\\n\\n'));

  constructor() {
    this.generate();
  }

  generate() {
    const paragraphs: string[] = [];
    const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "dolor", "in", "reprehenderit", "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "in", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum"];
    
    const num = Math.max(1, Math.min(50, this.count()));

    for (let i = 0; i < num; i++) {
      let paragraph = "";
      if (i === 0 && this.startWithLorem()) {
        paragraph = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";
      }
      
      const length = Math.floor(Math.random() * 50) + 20;
      for (let j = 0; j < length; j++) {
         const word = words[Math.floor(Math.random() * words.length)];
         if (j === 0 && !paragraph) {
            paragraph += word.charAt(0).toUpperCase() + word.slice(1);
         } else {
            paragraph += (paragraph ? " " : "") + word;
         }
      }
      paragraph += ".";
      paragraphs.push(paragraph);
    }
    this.output.set(paragraphs);
  }

  copy() {
    this.clipboard.copy(this.resultString(), "Lorem Ipsum");
  }
}