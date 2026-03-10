import { Component, ElementRef, HostListener, signal, computed, inject, input, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { buildHtmlDocument, parseMarkdownToHtml } from './markdown-preview.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-markdown-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="markdown-preview">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        class="glass-surface relative flex h-full flex-col overflow-hidden rounded-xl"
      >
        <!-- Widget Header -->
        <div
          class="glass-subsection flex flex-shrink-0 items-center justify-between border-b p-2"
        >
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-sm text-slate-500">markdown</span>
            <span class="truncate text-xs font-bold text-slate-600 uppercase dark:text-slate-300"
              >Markdown</span
            >
          </div>
          <div class="flex items-center gap-2">
            <!-- Toggle View -->
            <div class="glass-control flex rounded p-0.5">
              <button
                (click)="activeTab.set('editor')"
                class="rounded px-2 py-0.5 text-[10px] font-bold transition-colors"
                [class.bg-white]="activeTab() === 'editor'"
                [class.dark:bg-slate-600]="activeTab() === 'editor'"
                [class.shadow-sm]="activeTab() === 'editor'"
              >
                Edit
              </button>
              <button
                (click)="activeTab.set('preview')"
                class="rounded px-2 py-0.5 text-[10px] font-bold transition-colors"
                [class.bg-white]="activeTab() === 'preview'"
                [class.dark:bg-slate-600]="activeTab() === 'preview'"
                [class.shadow-sm]="activeTab() === 'preview'"
              >
                View
              </button>
            </div>
            <button
              (click)="openExpanded()"
              class="glass-control rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              title="Expand"
            >
              <span class="material-symbols-outlined text-sm">open_in_full</span>
            </button>
          </div>
        </div>

        <!-- Widget Content -->
        <div class="relative flex-1 overflow-hidden">
          @if (activeTab() === 'editor') {
            <textarea
              [(ngModel)]="rawMarkdown"
              class="h-full w-full resize-none overflow-auto bg-transparent p-3 font-mono text-xs text-slate-800 focus:outline-none dark:text-slate-200"
              [placeholder]="t.map()['PLACEHOLDER']"
            ></textarea>
          } @else {
            <div class="h-full w-full overflow-y-auto p-3">
              <article
                class="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-pre:my-2 max-w-none"
                [innerHTML]="parsedHtml()"
              ></article>
            </div>
          }
        </div>
      </div>
    }

    <!-- Full Tool Content Template -->
    <ng-template #mainContent>
      <div
        class="glass-surface glass-surface-hover flex h-[min(74vh,46rem)] flex-col overflow-hidden rounded-2xl"
      >
        <!-- Toolbar -->
        <div
          class="glass-subsection flex flex-shrink-0 items-center justify-between border-b px-4 py-3"
        >
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-sm text-slate-400">edit_note</span>
            <h3
              class="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              {{ t.map()['EDITOR_TITLE'] }}
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="toggleExpanded()"
              class="glass-button rounded-lg border p-1.5 text-slate-600 dark:text-slate-200"
              [title]="isExpanded() ? 'Exit expanded view' : 'Expand editor'"
            >
              <span class="material-symbols-outlined text-base">
                {{ isExpanded() ? 'close_fullscreen' : 'open_in_full' }}
              </span>
            </button>
            <span class="material-symbols-outlined text-sm text-slate-400">visibility</span>
            <h3
              class="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              {{ t.map()['PREVIEW_TITLE'] }}
            </h3>
          </div>
        </div>

        <!-- Split View -->
        <div class="flex flex-1 flex-col overflow-hidden md:flex-row">
          <!-- Input -->
          <div
            class="group relative flex-1 border-b border-slate-200 md:border-r md:border-b-0 dark:border-slate-700"
          >
            <textarea
              [(ngModel)]="rawMarkdown"
              class="h-full w-full resize-none overflow-auto bg-white p-6 font-mono text-sm text-slate-800 transition-colors focus:bg-slate-50 focus:outline-none dark:bg-slate-900 dark:text-slate-200 dark:focus:bg-slate-950/50"
              [placeholder]="t.map()['PLACEHOLDER']"
            ></textarea>
          </div>

          <!-- Output -->
          <div class="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-800/50">
            <article
              class="prose prose-slate dark:prose-invert prose-headings:font-bold prose-a:text-primary prose-code:text-pink-500 prose-pre:bg-slate-800 prose-pre:text-slate-100 max-w-none"
              [innerHTML]="parsedHtml()"
            ></article>
          </div>
        </div>

        <div class="glass-subsection flex items-center justify-between border-t px-4 py-2 text-xs text-slate-500">
          <span>{{ wordCount() }} words • {{ charCount() }} chars</span>
          <span class="text-slate-400">Markdown to HTML preview</span>
        </div>

        <!-- Action Bar (Footer) -->
        <app-action-bar
          [content]="outputHtml()"
          filename="document.html"
          mimeType="text/html"
          source="Markdown"
          [allowPrint]="true"
        ></app-action-bar>
      </div>
    </ng-template>

    <dialog
      #expandedDialog
      class="tool-modal-dialog"
      (close)="onExpandedDialogClose()"
      (click)="onExpandedDialogClick($event)"
    >
      <div
        class="tool-modal-panel glass-surface-strong flex h-[96vh] w-[98vw] max-w-[1800px] flex-col overflow-hidden rounded-2xl"
      >
          <div class="glass-subsection flex items-center justify-between border-b px-4 py-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-sm text-slate-500">markdown</span>
              <span class="text-xs font-bold tracking-wider text-slate-500 uppercase">Expanded Markdown</span>
            </div>
            <button
              (click)="closeExpanded()"
              class="glass-button rounded-lg border p-1.5 text-slate-600 dark:text-slate-200"
              title="Close expanded view"
            >
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div class="flex flex-1 flex-col overflow-hidden md:flex-row">
            <div class="flex-1 border-b border-slate-200 md:border-r md:border-b-0 dark:border-slate-700">
              <textarea
                [(ngModel)]="rawMarkdown"
                class="h-full w-full resize-none overflow-auto bg-white p-6 font-mono text-sm text-slate-800 focus:outline-none dark:bg-slate-900 dark:text-slate-200"
                [placeholder]="t.map()['PLACEHOLDER']"
              ></textarea>
            </div>
            <div class="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-800">
              <article
                class="prose prose-slate dark:prose-invert prose-headings:font-bold prose-a:text-primary prose-code:text-pink-500 prose-pre:bg-slate-800 prose-pre:text-slate-100 max-w-none"
                [innerHTML]="parsedHtml()"
              ></article>
            </div>
          </div>

          <div class="glass-subsection flex items-center justify-between border-t px-4 py-2 text-xs text-slate-500">
            <span>{{ wordCount() }} words • {{ charCount() }} chars</span>
            <span class="text-slate-400">Esc to close</span>
          </div>

          <app-action-bar
            [content]="outputHtml()"
            filename="document.html"
            mimeType="text/html"
            source="Markdown"
            [allowPrint]="true"
          ></app-action-bar>
      </div>
    </dialog>
  `,
})
export class MarkdownPreviewComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  isExpanded = signal(false);
  expandedDialog = viewChild<ElementRef<HTMLDialogElement>>('expandedDialog');

  activeTab = signal<'editor' | 'preview'>('preview');

  rawMarkdown = signal(`# Welcome to Utildex Markdown

This is a **bold** statement.
This is *italic*.

## Lists
- Item 1
- Item 2
  - Nested

## Code
\`console.log('Hello');\`

> "Simplicity is the ultimate sophistication."

[Visit Google](https://google.com)
`);

  parsedHtml = computed(() => {
    return parseMarkdownToHtml(this.rawMarkdown());
  });

  // Full HTML Document for export
  outputHtml = computed(() => {
    return buildHtmlDocument(this.parsedHtml());
  });

  toggleExpanded() {
    if (this.isExpanded()) {
      this.closeExpanded();
    } else {
      this.openExpanded();
    }
  }

  openExpanded() {
    const dialog = this.expandedDialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
    this.isExpanded.set(true);
  }

  closeExpanded() {
    const dialog = this.expandedDialog()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.isExpanded.set(false);
  }

  onExpandedDialogClose() {
    this.isExpanded.set(false);
  }

  onExpandedDialogClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeExpanded();
    }
  }

  wordCount() {
    const text = this.rawMarkdown().trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }

  charCount() {
    return this.rawMarkdown().length;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isExpanded()) {
      this.closeExpanded();
    }
  }
}
