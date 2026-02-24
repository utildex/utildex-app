import {
  Component,
  input,
  inject,
  signal,
  computed,
  OnInit,
  ElementRef,
  viewChild,
  Type,
} from '@angular/core';
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
        <div
          class="flex h-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500 dark:border-red-800 dark:bg-red-900/10"
        >
          <div class="text-center">
            <span class="material-symbols-outlined mb-2">error</span>
            <p class="text-xs">Failed to load</p>
          </div>
        </div>
      } @else if (!componentType()) {
        <div
          class="flex h-full animate-pulse items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800"
        >
          <span class="text-xs text-slate-400">Loading...</span>
        </div>
      } @else {
        <!-- Important: pointer-events-auto ensures inputs inside the dynamic component work, BUT NOT if it's a phantom -->
        <div class="h-full w-full" [class.pointer-events-auto]="!isPhantom()">
          <ng-container *ngComponentOutlet="componentType(); inputs: widgetInputs()" />
        </div>
      }
    }

    <!-- Case: Note -->
    @else if (widget().type === 'note') {
      <div
        class="group relative flex h-full w-full flex-col rounded-xl border border-yellow-200 bg-yellow-100 p-4 text-yellow-900 shadow-sm dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-100"
      >
        <textarea
          [ngModel]="widget().data?.['content'] || ''"
          (ngModelChange)="updateContent($event)"
          class="h-full w-full resize-none border-none bg-transparent p-0 text-sm font-medium placeholder-yellow-800/50 outline-none focus:ring-0 dark:placeholder-yellow-100/30"
          [class.pointer-events-auto]="!isPhantom()"
          [placeholder]="notePlaceholder()"
        ></textarea>
      </div>
    }

    <!-- Case: Image -->
    @else if (widget().type === 'image') {
      <div
        class="group relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
        [class.pointer-events-auto]="!isPhantom()"
      >
        @if (widget().data?.['url']) {
          <img
            [src]="widget().data?.['url']"
            class="pointer-events-none h-full w-full object-cover"
          />
        } @else {
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400"
          >
            <span class="material-symbols-outlined text-4xl">image</span>
            <span class="text-xs text-slate-500">No Image Set</span>
          </div>
        }

        <!-- Hover Edit Button (Visible in View Mode if empty, or always in Edit Mode via dashboard controls) -->
        <button
          (click)="promptImage()"
          class="absolute inset-0 z-10 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
          [class.opacity-100]="!widget().data?.['url']"
        >
          <span class="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black">
            {{ widget().data?.['url'] ? 'Change Image' : 'Set Image URL' }}
          </span>
          <input
            #fileInput
            type="file"
            class="hidden"
            accept="image/*"
            (change)="handleFileSelect($event)"
          />
        </button>
      </div>
    }

    <!-- Case: Spacer -->
    @else if (widget().type === 'spacer') {
      <div
        class="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 opacity-50 dark:border-slate-700"
      >
        <span class="text-xs font-bold tracking-widest text-slate-400 uppercase">Spacer</span>
      </div>
    }
  `,
})
export class WidgetHostComponent implements OnInit {
  widget = input.required<DashboardWidget>();
  isEditMode = input<boolean>(false);
  isPhantom = input<boolean>(false);

  toolService = inject(ToolService);
  i18n = inject(I18nService);

  componentType = signal<Type<unknown> | null>(null);
  error = signal<boolean>(false);
  widgetInputs = signal<Record<string, unknown>>({});

  fileInput = viewChild<ElementRef>('fileInput');

  notePlaceholder = computed(() => {
    const lang = this.i18n.currentLang();
    switch (lang) {
      case 'fr':
        return 'Écrivez une note...';
      case 'es':
        return 'Escribe una nota...';
      case 'zh':
        return '输入笔记...';
      default:
        return 'Type a note...';
    }
  });

  ngOnInit() {
    if (this.widget().type === 'tool' && this.widget().toolId) {
      this.loadComponent();
    }
    this.updateInputs();
  }

  updateInputs() {
    this.widgetInputs.set({
      isWidget: true,
      widgetConfig: {
        cols: this.widget().layout.w,
        rows: this.widget().layout.h,
        instanceId: this.widget().instanceId,
        ...this.widget().data,
      },
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

  private updateTimeout: ReturnType<typeof setTimeout> | null = null;

  updateContent(content: string) {
    if (this.updateTimeout) clearTimeout(this.updateTimeout);

    this.updateTimeout = setTimeout(() => {
      this.toolService.updateWidgetData(this.widget().instanceId, { content });
    }, 500); // 500ms Debounce
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
