import { Component, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-json-formatter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent, FileDropDirective],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="json-formatter">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700">
         <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <span class="text-xs font-bold uppercase text-slate-500 px-1">JSON Formatter</span>
            <div class="flex gap-1">
               <button (click)="minify()" class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500" title="Minify">
                  <span class="material-symbols-outlined text-sm">compress</span>
               </button>
               <button (click)="format()" class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500" title="Format">
                  <span class="material-symbols-outlined text-sm">data_object</span>
               </button>
            </div>
         </div>
         <div class="flex-1 relative group p-0">
             <textarea 
               [(ngModel)]="content"
               [placeholder]="t.map()['INPUT_PLACEHOLDER']"
               class="w-full h-full p-2 resize-none bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
             ></textarea>
         </div>
      </div>
    }

    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-16rem)] min-h-[500px]">
        
        <!-- Toolbar -->
        <div class="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
           <div class="flex items-center gap-4">
             <div class="flex items-center gap-2">
               <label class="text-xs font-bold text-slate-500 uppercase">{{ t.map()['INDENT_LABEL'] }}</label>
               <select 
                 [(ngModel)]="indentSize" 
                 (change)="format()"
                 class="text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-primary focus:border-primary"
               >
                 <option [ngValue]="2">{{ t.map()['TAB_2'] }}</option>
                 <option [ngValue]="4">{{ t.map()['TAB_4'] }}</option>
                 <option value="tab">{{ t.map()['TAB_TAB'] }}</option>
               </select>
             </div>
           </div>

           <div class="flex items-center gap-2">
              <button (click)="clear()" class="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors">
                {{ t.map()['BTN_CLEAR'] }}
              </button>
              <button (click)="minify()" class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                {{ t.map()['BTN_MINIFY'] }}
              </button>
              <button (click)="format()" class="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm">
                {{ t.map()['BTN_FORMAT'] }}
              </button>
           </div>
        </div>

        <!-- Editor Area -->
        <div class="flex-1 relative group">
          <textarea 
            appFileDrop
            (fileDropped)="handleFileDrop($event)"
            [(ngModel)]="content"
            (ngModelChange)="error.set(null)"
            [placeholder]="t.map()['INPUT_PLACEHOLDER']"
            class="w-full h-full p-6 resize-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-sm focus:outline-none transition-colors"
            [class.bg-red-50]="error()"
            [class.dark:bg-red-900/10]="error()"
          ></textarea>
          
          <!-- File Drop Overlay Hint -->
          <div class="pointer-events-none absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-xl z-10 hidden group-[.drag-over]:flex items-center justify-center">
             <div class="bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg text-primary font-bold">
               Drop JSON file here
             </div>
          </div>

          <!-- Error Message -->
          @if (error()) {
            <div class="absolute bottom-4 left-4 right-4 bg-red-100 dark:bg-red-900/80 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl shadow-lg border border-red-200 dark:border-red-800 flex items-start gap-3 animate-fade-in">
              <span class="material-symbols-outlined text-xl mt-0.5">warning</span>
              <div>
                <strong class="block font-bold">{{ t.map()['ERROR_INVALID'] }}</strong>
                <span class="text-sm font-mono opacity-90">{{ error() }}</span>
              </div>
            </div>
          }
        </div>

        <!-- Actions -->
        @if (content() && !error()) {
          <app-action-bar 
             [content]="content()" 
             filename="data.json" 
             mimeType="application/json" 
             source="JSON Formatter"
          ></app-action-bar>
        }
      </div>
    </ng-template>
  `
})
export class JsonFormatterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);

  content = signal<string>('');
  indentSize = signal<number | 'tab'>(2);
  error = signal<string | null>(null);

  format() {
    if (!this.content().trim()) return;
    try {
      const obj = JSON.parse(this.content());
      const space = this.indentSize() === 'tab' ? '\\t' : this.indentSize();
      this.content.set(JSON.stringify(obj, null, space as any));
      this.error.set(null);
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  minify() {
    if (!this.content().trim()) return;
    try {
      const obj = JSON.parse(this.content());
      this.content.set(JSON.stringify(obj));
      this.error.set(null);
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  clear() {
    this.content.set('');
    this.error.set(null);
  }

  handleFileDrop(files: FileList) {
    const file = files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
       const reader = new FileReader();
       reader.onload = (e) => {
         this.content.set(e.target?.result as string);
         this.format();
       };
       reader.readAsText(file);
    } else {
      this.toast.show('Please drop a JSON file', 'error');
    }
  }
}