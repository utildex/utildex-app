import { Component, signal, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
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
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Widget Header -->
        <div
          class="flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50"
        >
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-sm text-slate-500">markdown</span>
            <span class="truncate text-xs font-bold text-slate-600 uppercase dark:text-slate-300"
              >Markdown</span
            >
          </div>
          <!-- Toggle View -->
          <div class="flex rounded bg-slate-200 p-0.5 dark:bg-slate-700">
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
        </div>

        <!-- Widget Content -->
        <div class="relative flex-1 overflow-hidden">
          @if (activeTab() === 'editor') {
            <textarea
              [(ngModel)]="rawMarkdown"
              class="h-full w-full resize-none bg-transparent p-3 font-mono text-xs text-slate-800 focus:outline-none dark:text-slate-200"
              [placeholder]="t.map()['PLACEHOLDER']"
            ></textarea>
          } @else {
            <div class="h-full w-full overflow-y-auto bg-slate-50 p-3 dark:bg-slate-900/30">
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
        class="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Toolbar -->
        <div
          class="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
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
            <span class="material-symbols-outlined text-sm text-slate-400">visibility</span>
            <h3
              class="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              {{ t.map()['PREVIEW_TITLE'] }}
            </h3>
          </div>
        </div>

        <!-- Split View -->
        <div class="flex h-[500px] flex-1 flex-col overflow-hidden md:flex-row">
          <!-- Input -->
          <div
            class="group relative flex-1 border-b border-slate-200 md:border-r md:border-b-0 dark:border-slate-700"
          >
            <textarea
              [(ngModel)]="rawMarkdown"
              class="h-full w-full resize-none bg-white p-6 font-mono text-sm text-slate-800 transition-colors focus:bg-slate-50 focus:outline-none dark:bg-slate-900 dark:text-slate-200 dark:focus:bg-slate-950/50"
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
  `,
})
export class MarkdownPreviewComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);

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
    let md = this.rawMarkdown();
    if (!md) return '';

    // Escape HTML (Basic security)
    md = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headers
    md = md.replace(/^# (.*$)/gim, '<h1 class="text-3xl mb-4">$1</h1>');
    md = md.replace(/^## (.*$)/gim, '<h2 class="text-2xl mb-3">$1</h2>');
    md = md.replace(/^### (.*$)/gim, '<h3 class="text-xl mb-2">$1</h3>');

    // Bold/Italic
    md = md.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    md = md.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // Blockquote
    md = md.replace(
      /^\> (.*$)/gim,
      '<blockquote class="border-l-4 border-slate-300 pl-4 italic">$1</blockquote>',
    );

    // Code
    md = md.replace(
      /`(.*?)`/gim,
      '<code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">$1</code>',
    );

    // Links
    md = md.replace(
      /\[([^\]]+)\]\(([^)]+)\)/gim,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    );

    // Lists (Basic)
    md = md.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>');
    md = md.replace(/<\/ul>\s*<ul>/gim, '');

    // Paragraphs
    md = md.replace(/\n\n/gim, '<br><br>');
    md = md.replace(/([^>])\n([^<])/gim, '$1<br>$2');

    return md;
  });

  // Full HTML Document for export
  outputHtml = computed(() => {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Exported Markdown</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.5;max-width:800px;margin:0 auto;padding:2rem;color:#333}h1,h2,h3{color:#111}code{background:#f1f5f9;padding:0.2em 0.4em;border-radius:4px;font-family:monospace}blockquote{border-left:4px solid #cbd5e1;padding-left:1em;font-style:italic;color:#64748b}</style>
</head>
<body>
${this.parsedHtml()}
</body>
</html>`;
  });
}
