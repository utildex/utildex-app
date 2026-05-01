import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewEncapsulation,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ProcessingLoaderComponent } from '../../components/processing-loader';
import type { ProcessingLoaderState } from '../../components/processing-loader';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { ClipboardService } from '../../services/clipboard.service';
import { DbService } from '../../services/db.service';
import { ToastService } from '../../services/toast.service';
import { ToolState } from '../../services/tool-state';
import {
  CodeSnippetKernel,
  type ExportPresetId,
  type ResolvedSnippetLanguage,
  type SnippetLanguage,
  SUPPORTED_RESOLVED_SNIPPET_LANGUAGES,
} from './code-snippet-viewer.kernel';
import {
  buildSnippetLanguageExtension,
  buildSnippetSyntaxHighlightExtension,
} from './code-snippet-viewer.language-extension';
import { SnippetExportRenderer } from './code-snippet-viewer.export-renderer';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type ExportFormat = 'png' | 'jpg' | 'svg' | 'gif';
type SnippetTheme = 'dark' | 'light';
type DownloadQualityId = 'low' | 'medium' | 'high';

interface ViewerState {
  code: string;
  width: number;
  height: number;
  customWidth: number;
  customHeight: number;
  theme: SnippetTheme;
  withTitle: boolean;
  title: string;
  languageMode: 'auto' | 'manual';
  manualLanguage: ResolvedSnippetLanguage;
  exportPreset: ExportPresetId;
}

const MIN_CUSTOM_CANVAS_SIZE = 320;
const MAX_CUSTOM_CANVAS_SIZE = 20000;

interface DownloadQualityPreset {
  id: DownloadQualityId;
  label: string;
  pixelRatio: number;
  jpegQuality: number;
  gifMaxColors: number;
  gifDurationMs: number;
  sizeWeight: number;
}

const DOWNLOAD_QUALITY_PRESETS: Record<DownloadQualityId, DownloadQualityPreset> = {
  low: {
    id: 'low',
    label: 'Low',
    pixelRatio: 1,
    jpegQuality: 0.8,
    gifMaxColors: 96,
    gifDurationMs: 2600,
    sizeWeight: 0.42,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    pixelRatio: 1.5,
    jpegQuality: 0.9,
    gifMaxColors: 160,
    gifDurationMs: 3400,
    sizeWeight: 0.68,
  },
  high: {
    id: 'high',
    label: 'High',
    pixelRatio: 2,
    jpegQuality: 0.95,
    gifMaxColors: 256,
    gifDurationMs: 4200,
    sizeWeight: 1,
  },
};

const GIF_FPS_OPTIONS = [6, 10, 15, 24] as const;

type ResizeDirection = 'e' | 's' | 'se';

@Component({
  selector: 'app-code-snippet-viewer',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ProcessingLoaderComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="code-snippet-viewer">
        <ng-container *ngTemplateOutlet="content"></ng-container>
      </app-tool-layout>
    } @else {
      <ng-container *ngTemplateOutlet="content"></ng-container>
    }

    <ng-template #content>
      <div class="flex w-full justify-center">
        <div class="snippet-shell w-full max-w-full">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <select
                class="glass-control rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-100"
                [ngModel]="languageMode()"
                (ngModelChange)="setLanguageMode($event)"
                [title]="t.map()['LANGUAGE_MODE']"
              >
                <option value="auto">{{ t.map()['LANGUAGE_AUTO'] }}</option>
                <option value="manual">{{ t.map()['LANGUAGE_MANUAL'] }}</option>
              </select>

              @if (languageMode() === 'manual') {
                <select
                  class="glass-control rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-100"
                  [ngModel]="manualLanguage()"
                  (ngModelChange)="setManualLanguage($event)"
                  [title]="t.map()['LANGUAGE_PICK']"
                >
                  @for (language of manualLanguageOptions; track language) {
                    <option [value]="language">{{ language }}</option>
                  }
                </select>
              }

              <span class="text-xs text-slate-500 dark:text-slate-400">{{ detectionHint() }}</span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                (click)="beautifyAndFit()"
                class="glass-control rounded px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                [title]="t.map()['BTN_BEAUTIFY']"
              >
                {{ t.map()['BTN_BEAUTIFY'] }}
              </button>

              <select
                class="glass-control rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-100"
                [ngModel]="exportPreset()"
                (ngModelChange)="setExportPreset($event)"
                [title]="t.map()['EXPORT_PRESET']"
              >
                @for (preset of exportPresetOptions; track preset.id) {
                  <option [value]="preset.id">{{ exportPresetLabel(preset.id) }}</option>
                }
              </select>

              @if (exportPreset() === 'custom') {
                <label
                  class="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  {{ t.map()['CANVAS_WIDTH_SHORT'] }}
                  <input
                    type="number"
                    min="320"
                    max="20000"
                    step="10"
                    class="glass-control w-20 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-100"
                    [ngModel]="customWidth()"
                    (ngModelChange)="setCustomWidth($event)"
                  />
                </label>
                <label
                  class="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  {{ t.map()['CANVAS_HEIGHT_SHORT'] }}
                  <input
                    type="number"
                    min="320"
                    max="20000"
                    step="10"
                    class="glass-control w-20 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-100"
                    [ngModel]="customHeight()"
                    (ngModelChange)="setCustomHeight($event)"
                  />
                </label>
              }

              <label
                class="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
              >
                <input
                  type="checkbox"
                  class="accent-primary"
                  [ngModel]="withTitle()"
                  (ngModelChange)="setWithTitle($event)"
                />
                {{ t.map()['WITH_TITLE'] }}
              </label>

              <button
                (click)="toggleTheme()"
                class="glass-control rounded p-1.5 text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
                [title]="theme() === 'dark' ? t.map()['THEME_DARK'] : t.map()['THEME_LIGHT']"
              >
                <span class="material-symbols-outlined text-sm">
                  {{ theme() === 'dark' ? 'dark_mode' : 'light_mode' }}
                </span>
              </button>

              <button
                (click)="copyCode()"
                class="glass-control rounded p-1.5 text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
                [title]="t.map()['BTN_COPY']"
              >
                <span class="material-symbols-outlined text-sm">content_copy</span>
              </button>

              <button
                (click)="openDownloadModal()"
                class="bg-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                [title]="t.map()['BTN_DOWNLOAD']"
              >
                <span>{{ t.map()['BTN_DOWNLOAD'] }}</span>
                <span class="material-symbols-outlined text-sm">download</span>
              </button>
            </div>
          </div>

          <div class="snippet-canvas-stage">
            <div
              #exportSurface
              class="snippet-canvas"
              [style.width.px]="editorWidth()"
              [style.height.px]="canvasPreviewHeight()"
            >
              <div
                class="canvas-handle handle-e"
                (pointerdown)="onResizeHandlePointerDown($event, 'e')"
              ></div>
              <div
                class="canvas-handle handle-s"
                (pointerdown)="onResizeHandlePointerDown($event, 's')"
              ></div>
              <div
                class="canvas-handle handle-se"
                (pointerdown)="onResizeHandlePointerDown($event, 'se')"
              ></div>

              <div
                class="snippet-surface"
                [class.theme-light]="theme() === 'light'"
                [style.width.px]="cardWidthPx()"
              >
                @if (withTitle()) {
                  <div class="snippet-titlebar">
                    <input
                      [ngModel]="title()"
                      (ngModelChange)="setTitle($event)"
                      [placeholder]="t.map()['TITLE_PLACEHOLDER']"
                      class="snippet-title-input"
                    />
                  </div>
                }

                <div
                  #editorHost
                  class="snippet-editor-shell"
                  [class.with-title]="withTitle()"
                  [attr.aria-label]="t.map()['INPUT_PLACEHOLDER']"
                  [style.height.px]="editorAreaHeight()"
                ></div>
              </div>
            </div>
          </div>

          @if (errorMessage()) {
            <div
              class="mt-2 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/50 dark:text-red-200"
            >
              {{ errorMessage() }}
            </div>
          }

          @if (downloadModalOpen()) {
            <div class="download-modal-backdrop" (click)="closeDownloadModal()"></div>
            <div class="download-modal" role="dialog" aria-modal="true">
              <div class="download-modal-header">
                <h3>{{ t.map()['DOWNLOAD_MODAL_TITLE'] }}</h3>
                <button class="glass-control rounded p-1" (click)="closeDownloadModal()">
                  <span class="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div class="download-modal-body">
                <label class="download-modal-label">{{ t.map()['DOWNLOAD_FORMAT'] }}</label>
                <select
                  class="glass-control rounded px-2 py-1.5 text-sm text-slate-700 dark:text-slate-100"
                  [ngModel]="selectedDownloadFormat()"
                  (ngModelChange)="setSelectedDownloadFormat($event)"
                >
                  <option value="png">{{ t.map()['FORMAT_PNG_LABEL'] }}</option>
                  <option value="jpg">{{ t.map()['FORMAT_JPG_LABEL'] }}</option>
                  <option value="svg">{{ t.map()['FORMAT_SVG_LABEL'] }}</option>
                  <option value="gif">{{ t.map()['FORMAT_GIF_LABEL'] }}</option>
                </select>

                @if (shouldShowQualityControl()) {
                  <label class="download-modal-label">
                    {{ t.map()['DOWNLOAD_QUALITY'] }}
                  </label>
                  <div class="download-quality-options">
                    @for (preset of downloadQualityOptions; track preset.id) {
                      <button
                        class="glass-control rounded px-2 py-1 text-xs font-medium"
                        [class.is-active]="selectedDownloadQuality() === preset.id"
                        (click)="setSelectedDownloadQuality(preset.id)"
                        type="button"
                      >
                        {{ qualityLabel(preset.id) }}
                      </button>
                    }
                  </div>
                }

                @if (selectedDownloadFormat() === 'gif') {
                  <label class="download-modal-label">{{ t.map()['DOWNLOAD_GIF_FPS'] }}</label>
                  <select
                    class="glass-control rounded px-2 py-1.5 text-sm text-slate-700 dark:text-slate-100"
                    [ngModel]="selectedGifFps()"
                    (ngModelChange)="setSelectedGifFps($event)"
                  >
                    @for (fps of gifFpsOptions; track fps) {
                      <option [value]="fps">{{ fps }} {{ t.map()['FPS_UNIT'] }}</option>
                    }
                  </select>
                }

                <div class="download-size-hint">
                  {{ t.map()['DOWNLOAD_ESTIMATED_SIZE'] }}:
                  <strong>{{ estimatedDownloadSizeLabel() }}</strong>
                </div>
              </div>

              <div class="download-modal-actions">
                <button
                  class="glass-control rounded px-3 py-1.5 text-sm"
                  (click)="closeDownloadModal()"
                >
                  {{ t.map()['BTN_CANCEL'] }}
                </button>
                <button
                  class="bg-primary rounded px-3 py-1.5 text-sm font-semibold text-white"
                  (click)="confirmDownload()"
                >
                  {{ t.map()['BTN_DOWNLOAD'] }}
                </button>
              </div>
            </div>
          }

          <app-processing-loader
            mode="overlay"
            [active]="downloadLoaderActive()"
            [state]="downloadLoaderState()"
            [title]="t.map()['LOADER_EXPORT_TITLE']"
            [messages]="downloadLoaderMessages()"
            [tips]="downloadLoaderTips()"
            [minVisibleMs]="550"
          />
        </div>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .snippet-shell {
        max-width: 100%;
      }

      .snippet-canvas-stage {
        width: 100%;
        display: flex;
        justify-content: center;
      }

      .snippet-canvas {
        position: relative;
        width: auto;
        max-width: 100%;
        margin-left: auto;
        margin-right: auto;
        min-height: 280px;
        border-radius: 16px;
        border: 1px dashed rgba(148, 163, 184, 0.4);
        background:
          radial-gradient(circle at 20% 18%, rgba(59, 130, 246, 0.22), rgba(59, 130, 246, 0) 38%),
          radial-gradient(circle at 84% 20%, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0) 36%),
          linear-gradient(180deg, #1b2740, #050d1e 68%, #020617);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.06),
          0 10px 24px rgba(15, 23, 42, 0.2);
      }

      .snippet-shell .glass-control {
        border: 1px solid rgba(148, 163, 184, 0.55);
        background: rgba(255, 255, 255, 0.92);
        box-shadow:
          0 1px 0 rgba(255, 255, 255, 0.8) inset,
          0 6px 14px rgba(15, 23, 42, 0.08);
      }

      .dark .snippet-shell .glass-control {
        border-color: rgba(148, 163, 184, 0.38);
        background: rgba(15, 23, 42, 0.78);
        box-shadow:
          0 1px 0 rgba(255, 255, 255, 0.1) inset,
          0 8px 20px rgba(2, 6, 23, 0.42);
      }

      .snippet-shell .glass-control:hover {
        border-color: rgba(59, 130, 246, 0.75);
      }

      .snippet-shell .glass-control:focus-visible {
        outline: 2px solid rgba(59, 130, 246, 0.85);
        outline-offset: 1px;
      }

      .snippet-shell .bg-primary {
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.28) inset,
          0 10px 22px rgba(37, 99, 235, 0.38);
      }

      .download-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 90;
        background: rgba(2, 6, 23, 0.58);
        backdrop-filter: blur(3px);
      }

      .download-modal {
        position: fixed;
        z-index: 100;
        top: 50%;
        left: 50%;
        width: min(92vw, 430px);
        transform: translate(-50%, -50%);
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: rgba(255, 255, 255, 0.96);
        color: #0f172a;
        box-shadow: 0 22px 60px rgba(15, 23, 42, 0.28);
      }

      .dark .download-modal {
        border-color: rgba(148, 163, 184, 0.35);
        background: rgba(15, 23, 42, 0.96);
        color: #e2e8f0;
        box-shadow: 0 26px 70px rgba(2, 6, 23, 0.62);
      }

      .download-modal-header,
      .download-modal-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 12px 14px;
      }

      .download-modal-header {
        border-bottom: 1px solid rgba(148, 163, 184, 0.32);
      }

      .download-modal-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }

      .download-modal-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
      }

      .download-modal-label {
        font-size: 12px;
        font-weight: 600;
        color: #475569;
      }

      .dark .download-modal-label {
        color: #94a3b8;
      }

      .download-quality-options {
        display: flex;
        gap: 8px;
      }

      .download-quality-options .glass-control.is-active {
        border-color: rgba(37, 99, 235, 0.9);
        color: #1d4ed8;
        background: rgba(191, 219, 254, 0.55);
      }

      .dark .download-quality-options .glass-control.is-active {
        border-color: rgba(96, 165, 250, 0.9);
        color: #bfdbfe;
        background: rgba(30, 64, 175, 0.42);
      }

      .download-size-hint {
        margin-top: 4px;
        font-size: 12px;
        color: #64748b;
      }

      .dark .download-size-hint {
        color: #94a3b8;
      }

      .download-modal-actions {
        border-top: 1px solid rgba(148, 163, 184, 0.32);
        justify-content: flex-end;
      }

      .snippet-surface {
        position: relative;
        width: min(100%, 90%);
        overflow: hidden;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
      }

      .snippet-surface.theme-light {
        border-color: rgba(226, 232, 240, 0.9);
        background: linear-gradient(170deg, rgba(255, 255, 255, 0.97), rgba(248, 250, 252, 0.95));
      }

      .snippet-titlebar {
        border-bottom: 1px solid rgba(148, 163, 184, 0.26);
        padding: 10px 12px;
        font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: #cbd5e1;
      }

      .snippet-title-input {
        width: 100%;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        line-height: 1.35;
        outline: none;
      }

      .theme-light .snippet-titlebar {
        color: #334155;
      }

      .snippet-editor-shell {
        height: 12rem;
        overflow: hidden;
      }

      .snippet-editor-shell.with-title {
        height: calc(12rem - 41px);
      }

      .snippet-editor-shell .cm-editor {
        height: 100%;
        max-height: 100%;
        overflow: hidden;
        border: 0;
        border-radius: 0 0 14px 14px;
        background: transparent;
      }

      .snippet-editor-shell .cm-scroller {
        height: 100%;
        max-height: 100%;
        overflow: auto;
        overscroll-behavior: contain;
        background: transparent;
        font-family:
          'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        line-height: 1.6;
      }

      .snippet-editor-shell .cm-gutters {
        background: transparent;
        border: 0;
      }

      .theme-light .snippet-editor-shell .cm-editor,
      .theme-light .snippet-editor-shell .cm-scroller,
      .theme-light .snippet-editor-shell .cm-gutters {
        background: rgba(255, 255, 255, 0.75);
      }

      .canvas-handle {
        position: absolute;
        z-index: 3;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.88);
        box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.38);
      }

      .handle-e {
        top: 50%;
        right: 6px;
        width: 12px;
        height: 54px;
        transform: translateY(-50%);
        cursor: ew-resize;
      }

      .handle-s {
        bottom: 6px;
        left: 50%;
        width: 54px;
        height: 12px;
        transform: translateX(-50%);
        cursor: ns-resize;
      }

      .handle-se {
        right: 5px;
        bottom: 5px;
        width: 16px;
        height: 16px;
        cursor: nwse-resize;
      }
    `,
  ],
})
export class CodeSnippetViewerComponent implements AfterViewInit, OnDestroy {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  clipboard = inject(ClipboardService);
  db = inject(DbService);

  editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');
  exportSurface = viewChild<ElementRef<HTMLDivElement>>('exportSurface');

  private readonly kernel = new CodeSnippetKernel();
  private readonly exportRenderer = new SnippetExportRenderer(this.kernel);

  manualLanguageOptions: ResolvedSnippetLanguage[] = [...SUPPORTED_RESOLVED_SNIPPET_LANGUAGES];

  exportPresetOptions: Array<{ id: ExportPresetId }> = [
    { id: 'instagram-square' },
    { id: 'instagram-portrait' },
    { id: 'instagram-story' },
    { id: 'linkedin-feed' },
    { id: 'x-landscape' },
    { id: 'custom' },
  ];

  private state = new ToolState<ViewerState>(
    'code-snippet-viewer',
    {
      code: "function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('Utildex'));\n",
      width: 760,
      height: 430,
      customWidth: 1280,
      customHeight: 720,
      theme: 'dark',
      withTitle: false,
      title: '',
      languageMode: 'auto',
      manualLanguage: 'typescript',
      exportPreset: 'x-landscape',
    },
    this.db,
  );

  code = this.state.select('code');
  editorWidth = this.state.select('width');
  canvasPreviewHeight = this.state.select('height');
  customWidth = this.state.select('customWidth');
  customHeight = this.state.select('customHeight');
  theme = this.state.select('theme');
  withTitle = this.state.select('withTitle');
  title = this.state.select('title');
  languageMode = this.state.select('languageMode');
  manualLanguage = this.state.select('manualLanguage');
  exportPreset = this.state.select('exportPreset');

  highlightedHtml = signal('');
  errorMessage = signal<string | null>(null);
  downloadModalOpen = signal(false);
  selectedDownloadFormat = signal<ExportFormat>('png');
  selectedDownloadQuality = signal<DownloadQualityId>('medium');
  selectedGifFps = signal<number>(10);
  downloadLoaderActive = signal(false);
  downloadLoaderState = signal<ProcessingLoaderState>('loading');
  detectedLanguage = signal<ResolvedSnippetLanguage>('plaintext');
  detectionConfidence = signal(1);
  resolvedCanvasWidth = signal(1280);
  resolvedCanvasHeight = signal(720);

  readonly downloadQualityOptions = [
    DOWNLOAD_QUALITY_PRESETS.low,
    DOWNLOAD_QUALITY_PRESETS.medium,
    DOWNLOAD_QUALITY_PRESETS.high,
  ];
  readonly gifFpsOptions = [...GIF_FPS_OPTIONS];
  readonly downloadLoaderMessages = signal<string[]>([]);
  readonly downloadLoaderTips = signal<string[]>([]);

  private editorView: EditorView | null = null;
  private readonly editorThemeCompartment = new Compartment();
  private readonly editorLanguageCompartment = new Compartment();
  private readonly editorSyntaxCompartment = new Compartment();
  private resizeSession: {
    dir: ResizeDirection;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null = null;
  private downloadLoaderCloseTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const selectedLanguage: SnippetLanguage =
        this.languageMode() === 'manual' ? this.manualLanguage() : 'auto';
      const detection = this.kernel.detectLanguage(this.code());
      const highlight = this.kernel.highlightSnippet(this.code(), selectedLanguage);

      this.detectedLanguage.set(detection.language);
      this.detectionConfidence.set(detection.confidence);
      this.highlightedHtml.set(highlight.html || '&nbsp;');
    });

    effect(() => {
      const presetId = this.getSafeExportPreset(this.exportPreset());
      const code = this.code();
      const theme = this.theme();
      const customWidth = this.customWidth();
      const customHeight = this.customHeight();

      if (presetId === 'custom') {
        const scaled = this.scaleCanvasToViewport(customWidth, customHeight);
        this.updateCanvasPreviewSize(scaled.width, scaled.height);
        return;
      }

      const scene = this.kernel.buildExportScene(code, {
        presetId,
        theme,
      });
      const scaled = this.scaleCanvasToViewport(scene.width, scene.height);
      this.updateCanvasPreviewSize(scaled.width, scaled.height);
    });

    effect(() => {
      this.syncEditorValue(this.code());
    });

    effect(() => {
      this.reconfigureEditorTheme(this.theme());
    });

    effect(() => {
      this.reconfigureEditorSyntax(this.theme());
    });

    effect(() => {
      this.reconfigureEditorLanguage(this.resolveEditorLanguage());
    });
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  ngOnDestroy() {
    this.clearDownloadLoaderCloseTimeout();
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    this.editorView?.destroy();
    this.editorView = null;
  }

  onCodeInput(value: string) {
    this.state.set('code', value);
    this.errorMessage.set(null);
  }

  setTheme(theme: SnippetTheme) {
    this.state.set('theme', theme);
  }

  toggleTheme() {
    this.state.set('theme', this.theme() === 'dark' ? 'light' : 'dark');
  }

  setWithTitle(value: boolean) {
    this.state.set('withTitle', Boolean(value));
  }

  setTitle(value: string) {
    this.state.set('title', value);
  }

  setLanguageMode(value: 'auto' | 'manual') {
    this.state.set('languageMode', value === 'manual' ? 'manual' : 'auto');
  }

  setManualLanguage(value: ResolvedSnippetLanguage) {
    if (!this.manualLanguageOptions.includes(value)) return;
    this.state.set('manualLanguage', value);
  }

  setExportPreset(value: ExportPresetId) {
    const allowed = this.exportPresetOptions.some((preset) => preset.id === value);
    this.state.set('exportPreset', allowed ? value : 'x-landscape');
  }

  private getSafeExportPreset(value: ExportPresetId): ExportPresetId {
    return this.exportPresetOptions.some((preset) => preset.id === value) ? value : 'x-landscape';
  }

  setCustomWidth(value: number | string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.state.set(
      'customWidth',
      this.clamp(Math.round(parsed), MIN_CUSTOM_CANVAS_SIZE, MAX_CUSTOM_CANVAS_SIZE),
    );
  }

  setCustomHeight(value: number | string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.state.set(
      'customHeight',
      this.clamp(Math.round(parsed), MIN_CUSTOM_CANVAS_SIZE, MAX_CUSTOM_CANVAS_SIZE),
    );
  }

  detectionHint(): string {
    if (this.languageMode() === 'manual') {
      return `${this.t.map()['DETECTION_MANUAL_PREFIX']}: ${this.manualLanguage()}`;
    }
    const confidence = Math.round(this.detectionConfidence() * 100);
    return `${this.t.map()['DETECTION_AUTO_PREFIX']}: ${this.detectedLanguage()} (${confidence}%)`;
  }

  exportPresetLabel(id: ExportPresetId): string {
    if (id === 'instagram-square') return this.t.map()['PRESET_INSTAGRAM_SQUARE'];
    if (id === 'instagram-portrait') return this.t.map()['PRESET_INSTAGRAM_PORTRAIT'];
    if (id === 'instagram-story') return this.t.map()['PRESET_INSTAGRAM_STORY'];
    if (id === 'linkedin-feed') return this.t.map()['PRESET_LINKEDIN_FEED'];
    if (id === 'x-landscape') return this.t.map()['PRESET_X_LANDSCAPE'];
    return this.t.map()['PRESET_CUSTOM'];
  }

  editorAreaHeight(): number {
    const canvasHeight = this.canvasPreviewHeight();
    const lines = Math.max(1, this.code().split(/\r?\n/).length);
    const natural = Math.round(lines * 19 + 34);
    const maxBody = Math.max(180, canvasHeight - (this.withTitle() ? 120 : 92));
    return this.clamp(natural, 170, maxBody);
  }

  cardWidthPx(): number {
    const maxWidth = Math.max(300, this.editorWidth() - 32);
    return this.kernel.estimateSnippetWidth(this.code(), {
      minWidth: 300,
      maxWidth,
    });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  onResizeHandlePointerDown(event: PointerEvent, dir: ResizeDirection) {
    if (event.button !== 0) return;

    event.preventDefault();
    this.setExportPreset('custom');

    this.resizeSession = {
      dir,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: this.customWidth(),
      startHeight: this.customHeight(),
    };

    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.onWindowPointerUp);
  }

  private readonly onWindowPointerMove = (event: PointerEvent) => {
    if (!this.resizeSession) return;

    const dx = event.clientX - this.resizeSession.startX;
    const dy = event.clientY - this.resizeSession.startY;

    const nextWidth =
      this.resizeSession.dir === 'e' || this.resizeSession.dir === 'se'
        ? this.resizeSession.startWidth + dx
        : this.resizeSession.startWidth;
    const nextHeight =
      this.resizeSession.dir === 's' || this.resizeSession.dir === 'se'
        ? this.resizeSession.startHeight + dy
        : this.resizeSession.startHeight;

    this.state.set(
      'customWidth',
      this.clamp(Math.round(nextWidth), MIN_CUSTOM_CANVAS_SIZE, MAX_CUSTOM_CANVAS_SIZE),
    );
    this.state.set(
      'customHeight',
      this.clamp(Math.round(nextHeight), MIN_CUSTOM_CANVAS_SIZE, MAX_CUSTOM_CANVAS_SIZE),
    );
  };

  private readonly onWindowPointerUp = () => {
    this.resizeSession = null;
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
  };

  private updateCanvasPreviewSize(width: number, height: number) {
    const nextWidth = this.clamp(Math.round(width), 360, this.maxCanvasWidth());
    const nextHeight = this.clamp(Math.round(height), 280, 780);

    if (this.editorWidth() !== nextWidth) {
      this.state.set('width', nextWidth);
    }
    if (this.canvasPreviewHeight() !== nextHeight) {
      this.state.set('height', nextHeight);
    }
  }

  private maxCanvasWidth(): number {
    const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
    return Math.max(420, viewportWidth - 120);
  }

  private scaleCanvasToViewport(width: number, height: number): { width: number; height: number } {
    const maxWidth = this.maxCanvasWidth();
    const maxHeight = 780;
    const safeWidth = this.clamp(Math.round(width), MIN_CUSTOM_CANVAS_SIZE, MAX_CUSTOM_CANVAS_SIZE);
    const safeHeight = this.clamp(
      Math.round(height),
      MIN_CUSTOM_CANVAS_SIZE,
      MAX_CUSTOM_CANVAS_SIZE,
    );
    const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);

    return {
      width: Math.round(safeWidth * scale),
      height: Math.round(safeHeight * scale),
    };
  }

  async beautifyAndFit() {
    if (!this.code().trim()) return;

    const viewportWidth = typeof window === 'undefined' ? 1200 : window.innerWidth;
    const selectedLanguage: SnippetLanguage =
      this.languageMode() === 'manual' ? this.manualLanguage() : 'auto';
    const targetWidth = Math.max(300, this.cardWidthPx() - 16);
    const targetHeight = Math.max(180, this.editorAreaHeight() - 24);

    const fit = await this.kernel.beautifyAndFit(this.code(), {
      selectedLanguage,
      targetWidthPx: targetWidth,
      targetHeightPx: targetHeight,
      minPrintWidth: 26,
      maxPrintWidth: 120,
      maxIterations: 8,
      minFontSizePx: 11,
      maxFontSizePx: 14,
    });

    this.state.set('code', fit.code);

    const nextWidth = Math.max(
      360,
      Math.min(Math.ceil(fit.widthPx + 42), Math.max(380, viewportWidth - 120)),
    );
    this.state.set('width', nextWidth);

    if (fit.error) {
      const severeOverflow = fit.widthPx > targetWidth * 1.12 || fit.heightPx > targetHeight * 1.12;
      if (!severeOverflow) {
        this.errorMessage.set(null);
        this.toast.show(this.t.map()['TOAST_BEAUTIFIED'], 'success');
        return;
      }

      this.errorMessage.set(fit.error);
      this.toast.show(fit.error, 'error');
      return;
    }

    this.toast.show(this.t.map()['TOAST_BEAUTIFIED'], 'success');
  }

  copyCode() {
    this.clipboard.copy(this.code(), this.t.map()['TITLE']);
  }

  openDownloadModal() {
    this.downloadModalOpen.set(true);
  }

  closeDownloadModal() {
    this.downloadModalOpen.set(false);
  }

  setSelectedDownloadFormat(value: ExportFormat) {
    this.selectedDownloadFormat.set(value);
  }

  setSelectedDownloadQuality(value: DownloadQualityId) {
    if (!DOWNLOAD_QUALITY_PRESETS[value]) {
      return;
    }
    this.selectedDownloadQuality.set(value);
  }

  setSelectedGifFps(value: number | string) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const safe = this.gifFpsOptions.includes(numeric as (typeof GIF_FPS_OPTIONS)[number])
      ? numeric
      : 10;
    this.selectedGifFps.set(safe);
  }

  shouldShowQualityControl(): boolean {
    return this.exportPreset() !== 'custom' && this.selectedDownloadFormat() !== 'svg';
  }

  qualityLabel(id: DownloadQualityId): string {
    if (id === 'low') return this.t.map()['QUALITY_LOW'];
    if (id === 'medium') return this.t.map()['QUALITY_MEDIUM'];
    return this.t.map()['QUALITY_HIGH'];
  }

  estimatedDownloadSizeLabel(): string {
    const safePresetId = this.getSafeExportPreset(this.exportPreset());
    const scene = this.kernel.buildExportScene(this.code(), {
      presetId: safePresetId,
      customWidth: this.customWidth(),
      customHeight: this.customHeight(),
      theme: this.theme(),
    });
    const format = this.selectedDownloadFormat();
    const quality = this.resolveAppliedQuality();
    const qualityPreset = DOWNLOAD_QUALITY_PRESETS[quality];
    const pixels = scene.width * scene.height;

    let estimatedBytes = pixels * 0.6;
    if (format === 'png') {
      estimatedBytes = pixels * 0.95 * qualityPreset.pixelRatio * qualityPreset.pixelRatio;
    } else if (format === 'jpg') {
      estimatedBytes =
        pixels *
        0.42 *
        qualityPreset.pixelRatio *
        qualityPreset.pixelRatio *
        qualityPreset.jpegQuality;
    } else if (format === 'gif') {
      const frameCount = Math.max(
        8,
        Math.round((qualityPreset.gifDurationMs / 1000) * this.selectedGifFps()),
      );
      estimatedBytes = pixels * frameCount * (0.065 + qualityPreset.sizeWeight * 0.035);
    } else if (format === 'svg') {
      const codeWeight = Math.max(1200, this.code().length * 3.1);
      estimatedBytes = codeWeight;
    }

    return this.formatBytes(estimatedBytes);
  }

  async confirmDownload() {
    const format = this.selectedDownloadFormat();

    if (!this.code().trim()) {
      const message = this.t.map()['ERROR_EMPTY_EXPORT'];
      this.errorMessage.set(message);
      this.toast.show(message, 'error');
      return;
    }

    if (!this.exportSurface()?.nativeElement) {
      this.toast.show(this.t.map()['ERROR_EXPORT_FAILED'], 'error');
      return;
    }

    this.downloadModalOpen.set(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    this.clearDownloadLoaderCloseTimeout();
    this.downloadLoaderState.set('loading');
    this.downloadLoaderMessages.set(
      format === 'gif'
        ? [
            this.t.map()['LOADER_MSG_PREP'],
            this.t.map()['LOADER_MSG_RENDER'],
            this.t.map()['LOADER_MSG_GIF_ENCODE'],
          ]
        : [this.t.map()['LOADER_MSG_PREP'], this.t.map()['LOADER_MSG_RENDER']],
    );
    this.downloadLoaderTips.set([
      this.t.map()['LOADER_TIP_LOCAL'],
      this.t.map()['LOADER_TIP_PERF'],
    ]);
    this.downloadLoaderActive.set(true);

    try {
      const selectedLanguage: SnippetLanguage =
        this.languageMode() === 'manual' ? this.manualLanguage() : 'auto';
      // If GIF, we plan for PNG (or JPG) and convert later
      const planFormat = format === 'gif' ? 'png' : format;

      const safePresetId = this.getSafeExportPreset(this.exportPreset());
      if (safePresetId !== this.exportPreset()) {
        this.state.set('exportPreset', safePresetId);
      }

      const plan = await this.kernel.prepareStaticExport(this.code(), {
        format: planFormat,
        presetId: safePresetId,
        customWidth: this.customWidth(),
        customHeight: this.customHeight(),
        theme: this.theme(),
        selectedLanguage,
        withTitle: this.withTitle(),
        title: this.title(),
      });

      const appliedQuality = this.resolveAppliedQuality();
      const qualityPreset = DOWNLOAD_QUALITY_PRESETS[appliedQuality];
      const rendered = await this.exportRenderer.render({
        plan,
        format,
        quality: qualityPreset,
        gifFps: this.selectedGifFps(),
        titleFallback: this.t.map()['TITLE_FALLBACK'],
      });

      this.downloadDataUrl(rendered.outputUrl, rendered.filename);
      this.finishDownloadLoader('success');
      this.toast.show(this.t.map()['TOAST_EXPORTED'], 'success');
    } catch (err) {
      console.error(err);
      this.finishDownloadLoader('error');
      this.toast.show(this.t.map()['ERROR_EXPORT_FAILED'], 'error');
    }
  }

  private finishDownloadLoader(state: Extract<ProcessingLoaderState, 'success' | 'error'>): void {
    this.downloadLoaderState.set(state);
    this.downloadLoaderCloseTimeout = setTimeout(() => {
      this.downloadLoaderActive.set(false);
      this.downloadLoaderCloseTimeout = null;
    }, 450);
  }

  private clearDownloadLoaderCloseTimeout(): void {
    if (!this.downloadLoaderCloseTimeout) {
      return;
    }

    clearTimeout(this.downloadLoaderCloseTimeout);
    this.downloadLoaderCloseTimeout = null;
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.downloadModalOpen()) {
      this.downloadModalOpen.set(false);
    }
  }

  private resolveAppliedQuality(): DownloadQualityId {
    if (this.exportPreset() === 'custom') {
      return 'high';
    }
    return this.selectedDownloadQuality();
  }

  private formatBytes(bytes: number): string {
    const safeBytes = Math.max(0, bytes);
    if (safeBytes < 1024) return `${Math.round(safeBytes)} B`;
    const kb = safeBytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  private initializeEditor() {
    const host = this.editorHost()?.nativeElement;
    if (!host || this.editorView) {
      return;
    }

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: this.code(),
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          keymap.of([indentWithTab]),
          this.editorLanguageCompartment.of(
            buildSnippetLanguageExtension(this.resolveEditorLanguage()),
          ),
          this.editorSyntaxCompartment.of(buildSnippetSyntaxHighlightExtension(this.theme())),
          this.editorThemeCompartment.of(this.buildEditorThemeExtension(this.theme())),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) {
              return;
            }

            const nextValue = update.state.doc.toString();
            if (nextValue !== this.code()) {
              this.onCodeInput(nextValue);
            }
          }),
        ],
      }),
      parent: host,
    });
  }

  private buildEditorThemeExtension(theme: SnippetTheme): Extension {
    if (theme === 'dark') {
      return EditorView.theme(
        {
          '&': {
            backgroundColor: 'transparent',
            color: '#e2e8f0',
          },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            color: '#94a3b8',
            border: 'none',
          },
          '.cm-activeLine, .cm-activeLineGutter': {
            backgroundColor: 'rgba(148, 163, 184, 0.12)',
          },
          '.cm-selectionBackground': {
            backgroundColor: 'rgba(96, 165, 250, 0.28) !important',
          },
          '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: '#e2e8f0',
          },
          '.cm-content': {
            caretColor: '#e2e8f0',
            padding: '16px 18px',
          },
        },
        { dark: true },
      );
    }

    return EditorView.theme(
      {
        '&': {
          backgroundColor: 'transparent',
          color: '#0f172a',
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          color: '#64748b',
          border: 'none',
        },
        '.cm-activeLine, .cm-activeLineGutter': {
          backgroundColor: 'rgba(148, 163, 184, 0.08)',
        },
        '.cm-selectionBackground': {
          backgroundColor: 'rgba(37, 99, 235, 0.22) !important',
        },
        '.cm-cursor, .cm-dropCursor': {
          borderLeftColor: '#0f172a',
        },
        '.cm-content': {
          caretColor: '#0f172a',
          padding: '16px 18px',
        },
      },
      { dark: false },
    );
  }

  private resolveEditorLanguage(): ResolvedSnippetLanguage {
    const selectedLanguage: SnippetLanguage =
      this.languageMode() === 'manual' ? this.manualLanguage() : 'auto';
    return this.kernel.resolveLanguage(this.code(), selectedLanguage);
  }

  private syncEditorValue(value: string) {
    if (!this.editorView) {
      return;
    }

    const current = this.editorView.state.doc.toString();
    if (current === value) {
      return;
    }

    this.editorView.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: value,
      },
    });
  }

  private reconfigureEditorTheme(theme: SnippetTheme) {
    if (!this.editorView) {
      return;
    }

    this.editorView.dispatch({
      effects: this.editorThemeCompartment.reconfigure(this.buildEditorThemeExtension(theme)),
    });
  }

  private reconfigureEditorSyntax(theme: SnippetTheme) {
    if (!this.editorView) {
      return;
    }

    this.editorView.dispatch({
      effects: this.editorSyntaxCompartment.reconfigure(
        buildSnippetSyntaxHighlightExtension(theme),
      ),
    });
  }

  private reconfigureEditorLanguage(language: ResolvedSnippetLanguage) {
    if (!this.editorView) {
      return;
    }

    this.editorView.dispatch({
      effects: this.editorLanguageCompartment.reconfigure(buildSnippetLanguageExtension(language)),
    });
  }

  private downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();

    if (dataUrl.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
    }
  }
}
