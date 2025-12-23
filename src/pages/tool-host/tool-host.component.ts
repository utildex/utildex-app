
import { Component, input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getToolComponent } from '../../core/tool-registry';
import { ToolService } from '../../services/tool.service';

@Component({
  selector: 'app-tool-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (error()) {
      <div class="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tool Not Found</h2>
        <p class="text-slate-500 dark:text-slate-400 max-w-md mb-6">
          The tool with ID "<span class="font-mono text-xs p-1 bg-slate-100 dark:bg-slate-800 rounded">{{ id() }}</span>" does not exist or could not be loaded.
        </p>
        <button (click)="goBack()" class="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-opacity">
          Browse Tools
        </button>
      </div>
    } @else if (componentType()) {
      <ng-container *ngComponentOutlet="componentType(); inputs: inputs()" />
    } @else {
      <!-- Loading State -->
      <div class="flex flex-col items-center justify-center py-40">
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-slate-400 animate-pulse font-medium">Loading tool...</p>
      </div>
    }
  `
})
export class ToolHostComponent {
  // Input binding from router for :id
  id = input.required<string>();

  toolService = inject(ToolService);
  router = inject(Router);

  componentType = signal<any>(null);
  error = signal<boolean>(false);

  // Default inputs for full page tools
  inputs = signal({
    isWidget: false,
    widgetConfig: null
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
    this.router.navigate(['/tools']);
  }
}
