import { Component, input, inject, signal, effect, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getToolComponent } from '../../core/tool-registry';
import { ToolService } from '../../services/tool.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-tool-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (error()) {
      <div class="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30"
        >
          <span class="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 class="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Tool Not Found</h2>
        <p class="mb-6 max-w-md text-slate-500 dark:text-slate-400">
          The tool with ID "<span
            class="rounded bg-slate-100 p-1 font-mono text-xs dark:bg-slate-800"
            >{{ id() }}</span
          >" does not exist or could not be loaded.
        </p>
        <button
          (click)="goBack()"
          class="rounded-xl bg-slate-900 px-6 py-2 font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-slate-900"
        >
          Browse Tools
        </button>
      </div>
    } @else if (componentType()) {
      <ng-container *ngComponentOutlet="componentType(); inputs: inputs()" />
    } @else {
      <!-- Loading State -->
      <div class="flex flex-col items-center justify-center py-40">
        <div
          class="border-primary mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
        ></div>
        <p class="animate-pulse font-medium text-slate-400">Loading tool...</p>
      </div>
    }
  `,
})
export class ToolHostComponent {
  // Input binding from router for :id
  id = input.required<string>();

  toolService = inject(ToolService);
  router = inject(Router) as Router;
  i18n = inject(I18nService);

  componentType = signal<Type<unknown> | null>(null);
  error = signal<boolean>(false);

  // Default inputs for full page tools
  inputs = signal({
    isWidget: false,
    widgetConfig: null,
  });

  constructor() {
    effect(async () => {
      const toolId = this.id();
      if (!toolId) return;

      // Reset state on id change
      this.componentType.set(null);
      this.error.set(false);

      const importer = getToolComponent(toolId);
      if (!importer) {
        this.error.set(true);
        return;
      }

      try {
        const component = await importer();
        this.componentType.set(component);
      } catch (e) {
        console.error(`Failed to load tool ${toolId}`, e);
        this.error.set(true);
      }
    });
  }

  goBack() {
    this.router.navigate(['/', this.i18n.currentLang(), 'tools']);
  }
}
