
import { Component, input, inject, signal, computed, OnInit, ElementRef, viewChild, Type } from '@angular/core';
import { NgComponentOutlet, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getToolComponent } from '../../core/tool-registry';
import { DashboardWidget, ToolService } from '../../services/tool.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-widget-host',
  standalone: true,
  imports: [NgComponentOutlet, CommonModule, FormsModule],
  template: `
    <!-- Case: Tool -->
    @if (widget().type === 'tool') {
        @if (error()) {
          <div class="h-full flex items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800 text-red-500">
             <div class="text-center">
                <span class="material-symbols-outlined mb-2">error</span>
                <p class="text-xs">Failed to load</p>
             </div>
          </div>
        } @else if (!componentType()) {
           <div class="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse">
              <span class="text-xs text-slate-400">Loading...</span>
           </div>
        } @else {
          <!-- Important: pointer-events-auto ensures inputs inside the dynamic component work -->
          <div class="h-full w-full pointer-events-auto">
             <ng-container *ngComponentOutlet="componentType(); inputs: widgetInputs()" />
          </div>
        }
    } 
    
    <!-- Case: Note -->
    @else if (widget().type === 'note') {
        <div class="h-full w-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 p-4 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-800 flex flex-col relative group">
            <textarea 
                [ngModel]="widget().data?.['content'] || ''"
                (ngModelChange)="updateContent($event)"
                class="w-full h-full bg-transparent resize-none border-none outline-none focus:ring-0 p-0 text-sm font-medium placeholder-yellow-800/50 dark:placeholder-yellow-100/30 pointer-events-auto"
                [placeholder]="notePlaceholder()"
            ></textarea>
        </div>
    }

    <!-- Case: Image -->
    @else if (widget().type === 'image') {
        <div class="h-full w-full rounded-xl overflow-hidden relative bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group pointer-events-auto">
            @if (widget().data?.['url']) {
                <img [src]="widget().data?.['url']" class="w-full h-full object-cover pointer-events-none">
            } @else {
                <div class="absolute inset-0 flex items-center justify-center text-slate-400 flex-col gap-2">
                    <span class="material-symbols-outlined text-4xl">image</span>
                    <span class="text-xs text-slate-500">No Image Set</span>
                </div>
            }
            
            <!-- Hover Edit Button (Visible in View Mode if empty, or always in Edit Mode via dashboard controls) -->
            <button 
              (click)="promptImage()" 
              class="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-10"
              [class.opacity-100]="!widget().data?.['url']"
            >
               <span class="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold">
                 {{ widget().data?.['url'] ? 'Change Image' : 'Set Image URL' }}
               </span>
               <input 
                 #fileInput
                 type="file" 
                 class="hidden" 
                 accept="image/*"
                 (change)="handleFileSelect($event)"
               >
            </button>
        </div>
    }

    <!-- Case: Spacer -->
    @else if (widget().type === 'spacer') {
        <div class="h-full w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 opacity-50 flex items-center justify-center">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-widest">Spacer</span>
        </div>
    }
  `
})
export class WidgetHostComponent implements OnInit {
  widget = input.required<DashboardWidget>();
  isEditMode = input<boolean>(false);
  
  toolService = inject(ToolService);
  i18n = inject(I18nService);
  
  componentType = signal<Type<unknown> | null>(null);
  error = signal<boolean>(false);
  widgetInputs = signal<Record<string, unknown>>({});
  
  fileInput = viewChild<ElementRef>('fileInput');

  notePlaceholder = computed(() => {
    const lang = this.i18n.currentLang();
    switch (lang) {
        case 'fr': return 'Écrivez une note...';
        case 'es': return 'Escribe una nota...';
        case 'zh': return '输入笔记...';
        default: return 'Type a note...';
    }
  });

  ngOnInit() {
    if (this.widget().type === 'tool' && this.widget().toolId) {
       this.loadComponent();
    }
    this.updateInputs();
  }

  // Update inputs whenever widget changes to pass fresh data
  updateInputs() {
     // Pass the entire data object + instanceId to the child tool
     this.widgetInputs.set({
        isWidget: true,
        widgetConfig: { 
            cols: this.widget().layout.w, 
            rows: this.widget().layout.h,
            instanceId: this.widget().instanceId,
            ...this.widget().data 
        }
     });
  }

  async loadComponent() {
    const toolId = this.widget().toolId;
    if (!toolId) return;

    const importer = getToolComponent(toolId);
    
    if (!importer) {
      this.error.set(true);
      return;
    }

    try {
      const componentClass = await importer();
      this.componentType.set(componentClass);
    } catch (err) {
      console.error(`Failed to load widget ${toolId}`, err);
      this.error.set(true);
    }
  }

  updateContent(content: string) {
      this.toolService.updateWidgetData(this.widget().instanceId, { content });
  }

  promptImage() {
      this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        this.toolService.updateWidgetData(this.widget().instanceId, { url });
      };
      reader.readAsDataURL(file);
    }
  }
}
