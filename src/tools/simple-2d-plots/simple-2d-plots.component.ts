import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ProcessingLoaderComponent } from '../../components/processing-loader';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { DbService } from '../../services/db.service';
import { ToastService } from '../../services/toast.service';
import { ToolState } from '../../services/tool-state';
import {
  PRETTY_PLOT_SERIES_PALETTE,
  createPrettyPlot,
  multiSeriesSharedXPreset,
  multiSeriesStyledPreset,
  singleSeriesPreset,
  withCurve,
  withGrid,
  withLabels,
  withTooltip,
  type PrettyPlotConfig,
  type PrettyPlotRendererHandle,
} from '../../core/plotting/pretty';
import {
  listSharedExportBackgrounds,
  renderSharedBackgroundPreviewCanvas,
  type SharedExportBackgroundId,
  type SharedExportBackgroundSpec,
} from '../../core/export/shared-export-backgrounds';
import {
  defaultPresetData,
  defaultStyleMapData,
  parseMultiPresetInput,
  parseSinglePresetInput,
  parseStyleMap,
  type Simple2dPresetId,
} from './simple-2d-plots.kernel';
import { PlotDropdownComponent, type PlotDropdownOption } from './plot-dropdown.component';
import { PlotToggleComponent } from './plot-toggle.component';
import type { ProcessingLoaderState } from '../../components/processing-loader';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface Simple2dState {
  preset: Simple2dPresetId;
  dataJson: string;
  styleJson: string;
  xLabel: string;
  yLabel: string;
  curve: 'smooth' | 'linear';
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
}

type PlotStep = 'editor' | 'plot';
type EditorTab = 'data' | 'style';
type ExportFormat = 'png' | 'jpg' | 'svg' | 'gif';
type ExportQuality = 'low' | 'medium' | 'high';

const DEFAULT_STATE: Simple2dState = {
  preset: 'single',
  dataJson: defaultPresetData('single'),
  styleJson: defaultStyleMapData(),
  xLabel: 'X axis',
  yLabel: 'Y axis',
  curve: 'smooth',
  showLegend: true,
  showGrid: true,
  showTooltip: true,
};

@Component({
  selector: 'app-simple-2d-plots',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToolLayoutComponent,
    ProcessingLoaderComponent,
    PlotDropdownComponent,
    PlotToggleComponent,
  ],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  styles: [
    `
      .step-enter {
        animation: step-enter 150ms ease-out;
      }

      @keyframes step-enter {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .json-editor-wrap {
        border: 1px solid rgb(226 232 240 / 0.9);
      }

      .dark .json-editor-wrap {
        border-color: rgb(51 65 85 / 0.9);
      }

      .json-editor-wrap:focus-within {
        border-color: rgb(var(--color-primary) / 0.7);
      }

      .json-line-gutter {
        user-select: none;
      }

      .tool-viewport {
        height: min(82dvh, 52rem);
        min-height: 30rem;
      }

      @media (max-width: 640px) {
        .tool-viewport {
          height: min(78dvh, 44rem);
          min-height: 24rem;
        }
      }

      .export-sheet {
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        transform: translateY(0);
        animation: export-sheet-up 200ms ease-out;
      }

      @media (min-width: 640px) {
        .export-sheet {
          position: static;
          width: 420px;
          animation: none;
        }
      }

      @keyframes export-sheet-up {
        from {
          transform: translateY(16px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
  template: `
    <app-tool-layout toolId="simple-2d-plots">
      <div class="mx-4 flex w-[calc(100%-2rem)] justify-center">
        <ng-container *ngTemplateOutlet="card"></ng-container>
      </div>
    </app-tool-layout>

    <ng-template #card>
      <div
        class="tool-viewport glass-surface flex min-h-0 w-full max-w-[980px] flex-col overflow-hidden rounded-2xl p-4 shadow-2xl"
      >
        @if (step() === 'editor') {
          <section class="step-enter flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div class="flex items-center gap-2 max-[359px]:flex-col max-[359px]:items-stretch">
              <div class="min-w-0 flex-1 max-[359px]:w-full">
                <app-plot-dropdown
                  [value]="preset()"
                  [options]="presetOptions()"
                  (valueChange)="setPreset($event)"
                />
              </div>
              <button
                type="button"
                (click)="loadSample()"
                class="border-primary text-primary hover:bg-primary/10 h-12 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors max-[359px]:w-full"
              >
                {{ t.map()['BTN_SAMPLE'] }}
              </button>
            </div>

            <div class="grid gap-3">
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block text-xs">
                  <span class="mb-1 block text-slate-400 dark:text-slate-500">{{
                    t.map()['X_LABEL']
                  }}</span>
                  <input
                    class="glass-control h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
                    [ngModel]="xLabel()"
                    (ngModelChange)="setXLabel($event)"
                    [placeholder]="t.map()['X_LABEL_PLACEHOLDER']"
                  />
                </label>

                <label class="block text-xs">
                  <span class="mb-1 block text-slate-400 dark:text-slate-500">{{
                    t.map()['Y_LABEL']
                  }}</span>
                  <input
                    class="glass-control h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
                    [ngModel]="yLabel()"
                    (ngModelChange)="setYLabel($event)"
                    [placeholder]="t.map()['Y_LABEL_PLACEHOLDER']"
                  />
                </label>
              </div>

              <div class="grid gap-3 min-[480px]:grid-cols-[minmax(200px,260px)_1fr]">
                <div>
                  <label class="mb-1 block text-xs text-slate-400 dark:text-slate-500">{{
                    t.map()['CURVE_LABEL']
                  }}</label>
                  <app-plot-dropdown
                    [value]="curve()"
                    [options]="curveOptions()"
                    (valueChange)="setCurve($event)"
                  />
                </div>

                <div
                  class="flex flex-wrap items-center justify-start gap-4 min-[480px]:justify-end"
                >
                  <app-plot-toggle
                    [checked]="showLegend()"
                    [label]="t.map()['TOGGLE_LEGEND']"
                    (checkedChange)="setShowLegend($event)"
                  />
                  <app-plot-toggle
                    [checked]="showGrid()"
                    [label]="t.map()['TOGGLE_GRID']"
                    (checkedChange)="setShowGrid($event)"
                  />
                  <app-plot-toggle
                    [checked]="showTooltip()"
                    [label]="t.map()['TOGGLE_TOOLTIP']"
                    (checkedChange)="setShowTooltip($event)"
                  />
                </div>
              </div>
            </div>

            <div class="relative min-h-0 flex-1">
              <button
                type="button"
                class="glass-control absolute top-2 right-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                (click)="schemaPopoverOpen.update((v) => !v)"
              >
                ?
              </button>

              @if (schemaPopoverOpen()) {
                <div
                  class="glass-surface absolute top-10 right-2 z-30 w-72 rounded-xl p-3 text-xs text-slate-600 shadow-xl dark:text-slate-300"
                >
                  <div>{{ t.map()['SCHEMA_SINGLE'] }}</div>
                  <div class="mt-2">{{ t.map()['SCHEMA_MULTI'] }}</div>
                  <div class="mt-2">{{ t.map()['SCHEMA_STYLES'] }}</div>
                </div>
              }

              <div
                class="json-editor-wrap flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900/50"
              >
                <div class="border-b border-slate-200 dark:border-slate-700">
                  <div class="flex">
                    <button
                      type="button"
                      class="px-4 py-2 text-sm"
                      [class.border-b-2]="editorTab() === 'data'"
                      [class.border-primary]="editorTab() === 'data'"
                      [class.text-slate-800]="editorTab() === 'data'"
                      [class.dark:text-slate-100]="editorTab() === 'data'"
                      [class.text-slate-500]="editorTab() !== 'data'"
                      (click)="editorTab.set('data')"
                    >
                      {{ t.map()['DATA_INPUT'] }}
                    </button>
                    @if (preset() === 'styled') {
                      <button
                        type="button"
                        class="px-4 py-2 text-sm"
                        [class.border-b-2]="editorTab() === 'style'"
                        [class.border-primary]="editorTab() === 'style'"
                        [class.text-slate-800]="editorTab() === 'style'"
                        [class.dark:text-slate-100]="editorTab() === 'style'"
                        [class.text-slate-500]="editorTab() !== 'style'"
                        (click)="editorTab.set('style')"
                      >
                        {{ t.map()['STYLE_INPUT'] }}
                      </button>
                    }
                  </div>
                </div>

                <div class="flex min-h-0 flex-1">
                  <div
                    class="json-line-gutter min-w-[42px] overflow-hidden border-r border-slate-200 px-2 py-3 text-right font-mono text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500"
                  >
                    @for (line of activeLineNumbers(); track line) {
                      <div class="leading-6">{{ line }}</div>
                    }
                  </div>
                  <textarea
                    class="min-h-0 w-full flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-sm leading-6 text-slate-800 focus:outline-none dark:text-slate-100"
                    [ngModel]="activeEditorValue()"
                    (ngModelChange)="setActiveEditorValue($event)"
                  ></textarea>
                </div>
              </div>
            </div>

            <button
              type="button"
              (click)="renderPlot()"
              class="bg-primary mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition hover:brightness-110"
            >
              @if (isRendering()) {
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                ></span>
              }
              <span>{{ t.map()['BTN_RENDER'] }}</span>
            </button>

            @if (error()) {
              <div
                class="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200"
              >
                {{ error() }}
              </div>
            }
          </section>
        } @else {
          <section class="step-enter flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div class="flex h-11 items-center justify-between gap-2 text-sm">
              <button
                type="button"
                class="text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                (click)="openDataMode()"
              >
                ← {{ t.map()['BTN_BACK_TO_DATA'] }}
              </button>

              <button
                type="button"
                class="bg-primary inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-white hover:brightness-110"
                (click)="openExportModal()"
              >
                {{ t.map()['BTN_OPEN_EXPORT'] }}
              </button>
            </div>

            <div
              class="flex min-h-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/55"
            >
              <div
                class="h-full min-h-0 w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70"
              >
                <div #plotHost class="h-full w-full"></div>
              </div>
            </div>

            @if (showLegend() && legendItems().length > 0) {
              <div class="flex flex-wrap gap-2 min-[640px]:hidden">
                @for (item of legendItems(); track item.id) {
                  <span
                    class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    <span class="h-2.5 w-2.5 rounded-sm" [style.background]="item.color"></span>
                    {{ item.label }}
                  </span>
                }
              </div>
            }

            @if (error()) {
              <div
                class="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200"
              >
                {{ error() }}
              </div>
            }
          </section>
        }
      </div>

      @if (exportModalOpen()) {
        <div class="fixed inset-0 z-40 bg-black/40" (click)="closeExportModal()"></div>
        <div class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div class="export-sheet glass-surface w-full rounded-t-2xl p-4 sm:rounded-2xl sm:p-6">
            <div
              class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              <span class="material-symbols-outlined text-base">download</span>
              {{ t.map()['EXPORT_TITLE'] }}
            </div>

            <div class="mb-4 block sm:hidden">
              <div class="mx-auto h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600"></div>
            </div>

            <label class="mb-1 block text-xs text-slate-400 dark:text-slate-500">{{
              t.map()['EXPORT_FORMAT']
            }}</label>
            <app-plot-dropdown
              [value]="exportFormat()"
              [options]="formatOptions"
              (valueChange)="setExportFormat($event)"
            />

            @if (exportFormat() !== 'gif') {
              <label class="mt-3 mb-1 block text-xs text-slate-400 dark:text-slate-500">{{
                t.map()['EXPORT_QUALITY']
              }}</label>
              <app-plot-dropdown
                [value]="exportQuality()"
                [options]="qualityOptions()"
                (valueChange)="setExportQuality($event)"
              />
            } @else {
              <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label class="text-xs text-slate-400 dark:text-slate-500">
                  {{ t.map()['GIF_FPS'] }}
                  <input
                    class="glass-control mt-1 h-12 w-full rounded-lg px-3 text-sm"
                    type="number"
                    min="6"
                    max="30"
                    [ngModel]="gifFps()"
                    (ngModelChange)="gifFps.set(+$event || 12)"
                  />
                </label>
                <label class="text-xs text-slate-400 dark:text-slate-500">
                  {{ t.map()['GIF_DURATION'] }}
                  <input
                    class="glass-control mt-1 h-12 w-full rounded-lg px-3 text-sm"
                    type="number"
                    min="1000"
                    max="8000"
                    step="100"
                    [ngModel]="gifDurationMs()"
                    (ngModelChange)="gifDurationMs.set(+$event || 3200)"
                  />
                </label>
                <label class="text-xs text-slate-400 dark:text-slate-500">
                  {{ t.map()['GIF_COLORS'] }}
                  <input
                    class="glass-control mt-1 h-12 w-full rounded-lg px-3 text-sm"
                    type="number"
                    min="64"
                    max="256"
                    step="16"
                    [ngModel]="gifMaxColors()"
                    (ngModelChange)="gifMaxColors.set(+$event || 160)"
                  />
                </label>
              </div>
            }

            <label class="mt-3 mb-1 block text-xs text-slate-400 dark:text-slate-500">{{
              t.map()['EXPORT_BACKGROUND']
            }}</label>
            <app-plot-dropdown
              [value]="exportBackgroundId()"
              [options]="backgroundOptions()"
              (valueChange)="setExportBackgroundId($event)"
            />

            @if (isSolidBackgroundSelected()) {
              <label class="mt-3 block text-xs text-slate-400 dark:text-slate-500">
                {{ t.map()['EXPORT_BG_COLOR'] }}
                <input
                  class="glass-control mt-1 h-12 w-full rounded-lg px-3 text-sm"
                  type="color"
                  [ngModel]="exportSolidColor()"
                  (ngModelChange)="setExportSolidColor($event)"
                />
              </label>
            }

            <div class="mt-4">
              <div class="mb-1 text-xs text-slate-400 dark:text-slate-500">
                {{ t.map()['EXPORT_BG_PREVIEW'] }}
              </div>
              <div
                class="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <img
                  [src]="exportBackgroundPreviewUrl()"
                  [alt]="t.map()['EXPORT_BG_PREVIEW']"
                  class="h-28 w-full object-cover"
                />
              </div>
              @if (selectedBackgroundSupportsAnimation() && exportFormat() === 'gif') {
                <div class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {{ t.map()['EXPORT_BG_ANIM_HINT'] }}
                </div>
              }
            </div>

            <div class="mt-5 hidden justify-end gap-2 sm:flex">
              <button
                type="button"
                class="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                (click)="closeExportModal()"
              >
                {{ t.map()['BTN_CANCEL'] }}
              </button>
              <button
                type="button"
                class="bg-primary rounded-lg px-3 py-2 text-sm font-medium text-white hover:brightness-110"
                (click)="runExport()"
              >
                {{ t.map()['BTN_EXPORT'] }}
              </button>
            </div>

            <div class="mt-5 flex flex-col gap-2 sm:hidden">
              <button
                type="button"
                class="bg-primary h-12 rounded-lg text-sm font-medium text-white"
                (click)="runExport()"
              >
                {{ t.map()['BTN_EXPORT'] }}
              </button>
              <button
                type="button"
                class="h-12 rounded-lg border border-slate-300 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
                (click)="closeExportModal()"
              >
                {{ t.map()['BTN_CANCEL'] }}
              </button>
            </div>
          </div>
        </div>
      }

      <app-processing-loader
        mode="overlay"
        [active]="exportLoaderActive()"
        [state]="exportLoaderState()"
        [title]="t.map()['LOADER_EXPORT_TITLE']"
        [messages]="exportLoaderMessages()"
        [tips]="exportLoaderTips()"
        [minVisibleMs]="550"
      />
    </ng-template>
  `,
})
export class Simple2dPlotsComponent {
  readonly t = inject(ScopedTranslationService);
  private readonly db = inject(DbService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = new ToolState<Simple2dState>('simple-2d-plots', DEFAULT_STATE, this.db);

  readonly preset = this.state.select('preset');
  readonly dataJson = this.state.select('dataJson');
  readonly styleJson = this.state.select('styleJson');
  readonly xLabel = this.state.select('xLabel');
  readonly yLabel = this.state.select('yLabel');
  readonly curve = this.state.select('curve');
  readonly showLegend = this.state.select('showLegend');
  readonly showGrid = this.state.select('showGrid');
  readonly showTooltip = this.state.select('showTooltip');

  readonly plotHost = viewChild<ElementRef<HTMLElement>>('plotHost');

  readonly error = signal<string | null>(null);
  readonly statusText = signal<string>(this.t.map()['STATUS_READY']);
  readonly step = signal<PlotStep>('editor');
  readonly editorTab = signal<EditorTab>('data');
  readonly isRendering = signal<boolean>(false);
  readonly schemaPopoverOpen = signal<boolean>(false);

  readonly exportModalOpen = signal<boolean>(false);
  readonly exportFormat = signal<ExportFormat>('png');
  readonly exportQuality = signal<ExportQuality>('high');
  readonly exportBackgroundId = signal<SharedExportBackgroundId>('app-starfield-dark');
  readonly exportSolidColor = signal<string>('#0b1220');
  readonly exportBackgroundPreviewUrl = signal<string>('');
  readonly gifFps = signal<number>(12);
  readonly gifDurationMs = signal<number>(3200);
  readonly gifMaxColors = signal<number>(160);
  readonly exportLoaderActive = signal<boolean>(false);
  readonly exportLoaderState = signal<ProcessingLoaderState>('loading');

  readonly presetOptions = computed<PlotDropdownOption[]>(() => [
    { value: 'single', label: this.t.map()['PRESET_SINGLE'] },
    { value: 'multi', label: this.t.map()['PRESET_MULTI'] },
    { value: 'styled', label: this.t.map()['PRESET_STYLED'] },
  ]);

  readonly curveOptions = computed<PlotDropdownOption[]>(() => [
    { value: 'smooth', label: this.t.map()['CURVE_SMOOTH'] },
    { value: 'linear', label: this.t.map()['CURVE_LINEAR'] },
  ]);

  readonly formatOptions: PlotDropdownOption[] = [
    { value: 'png', label: 'PNG' },
    { value: 'jpg', label: 'JPG' },
    { value: 'svg', label: 'SVG' },
    { value: 'gif', label: 'GIF' },
  ];

  readonly qualityOptions = computed<PlotDropdownOption[]>(() => [
    { value: 'low', label: this.t.map()['QUALITY_LOW'] },
    { value: 'medium', label: this.t.map()['QUALITY_MEDIUM'] },
    { value: 'high', label: this.t.map()['QUALITY_HIGH'] },
  ]);

  readonly backgroundOptions = computed<PlotDropdownOption[]>(() =>
    listSharedExportBackgrounds(this.exportFormat()).map((definition) => ({
      value: definition.id,
      label: this.backgroundLabel(definition.id),
    })),
  );

  readonly isSolidBackgroundSelected = computed(() => this.exportBackgroundId() === 'solid-color');

  readonly selectedBackgroundSupportsAnimation = computed(() => {
    const definition = listSharedExportBackgrounds(this.exportFormat()).find(
      (entry) => entry.id === this.exportBackgroundId(),
    );
    return Boolean(definition?.supportsAnimation);
  });

  readonly activeEditorValue = computed(() =>
    this.editorTab() === 'style' ? this.styleJson() : this.dataJson(),
  );

  readonly exportLoaderMessages = computed<string[]>(() => {
    if (this.exportFormat() === 'gif') {
      return [
        this.t.map()['LOADER_MSG_PREP'],
        this.t.map()['LOADER_MSG_RENDER'],
        this.t.map()['LOADER_MSG_GIF_ENCODE'],
      ];
    }

    return [this.t.map()['LOADER_MSG_PREP'], this.t.map()['LOADER_MSG_RENDER']];
  });

  readonly exportLoaderTips = computed<string[]>(() => [
    this.t.map()['LOADER_TIP_LOCAL'],
    this.t.map()['LOADER_TIP_PERF'],
  ]);

  readonly activeLineNumbers = computed(() => {
    const lines = Math.max(1, this.activeEditorValue().split(/\r?\n/).length);
    return Array.from({ length: lines }, (_, index) => index + 1);
  });

  readonly legendItems = computed(() => {
    const config = this.lastRenderedConfig();
    if (!config || !this.showLegend()) {
      return [] as Array<{ id: string; label: string; color: string }>;
    }

    return config.series.map((series, index) => ({
      id: series.id,
      label: series.label ?? series.id,
      color: series.style?.color ?? config.theme.palette[index % config.theme.palette.length],
    }));
  });

  private renderer: PrettyPlotRendererHandle | null = null;
  private readonly lastRenderedConfig = signal<PrettyPlotConfig | null>(null);
  private exportLoaderCloseTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (!this.error()) {
        this.statusText.set(this.t.map()['STATUS_READY']);
      }
    });

    effect(() => {
      if (this.step() !== 'plot') {
        return;
      }

      const host = this.plotHost()?.nativeElement;
      if (!host) {
        return;
      }

      const config = this.buildPlotConfig();
      if (!config) {
        this.safeDestroyRenderer();
        this.isRendering.set(false);
        return;
      }

      if (!this.renderer) {
        this.renderer = createPrettyPlot(host, config);
      } else {
        this.renderer.update(config);
      }

      this.lastRenderedConfig.set(config);
      this.isRendering.set(false);
    });

    effect(() => {
      const options = this.backgroundOptions();
      if (options.length === 0) {
        return;
      }

      const current = this.exportBackgroundId();
      if (!options.some((option) => option.value === current)) {
        this.exportBackgroundId.set(options[0].value as SharedExportBackgroundId);
      }
    });

    effect(() => {
      if (!this.exportModalOpen()) {
        return;
      }

      const backgroundSpec = this.buildExportBackgroundSpec();
      const progress = this.selectedBackgroundSupportsAnimation() ? 0.32 : 0;
      const preview = renderSharedBackgroundPreviewCanvas(420, 180, backgroundSpec, progress);
      this.exportBackgroundPreviewUrl.set(preview.toDataURL('image/png'));
    });

    this.destroyRef.onDestroy(() => {
      this.clearExportLoaderCloseTimeout();
      this.safeDestroyRenderer();
    });
  }

  setPreset(nextPreset: Simple2dPresetId): void {
    this.state.update((s) => ({
      ...s,
      preset: nextPreset,
      dataJson: defaultPresetData(nextPreset),
      styleJson: nextPreset === 'styled' ? s.styleJson : s.styleJson,
    }));

    if (nextPreset !== 'styled' && this.editorTab() === 'style') {
      this.editorTab.set('data');
    }
  }

  setDataJson(value: string): void {
    this.state.update((s) => ({ ...s, dataJson: value }));
  }

  setStyleJson(value: string): void {
    this.state.update((s) => ({ ...s, styleJson: value }));
  }

  setXLabel(value: string): void {
    this.state.update((s) => ({ ...s, xLabel: value }));
  }

  setYLabel(value: string): void {
    this.state.update((s) => ({ ...s, yLabel: value }));
  }

  setCurve(value: 'smooth' | 'linear'): void {
    this.state.update((s) => ({ ...s, curve: value }));
  }

  setShowLegend(value: boolean): void {
    this.state.update((s) => ({ ...s, showLegend: value }));
  }

  setShowGrid(value: boolean): void {
    this.state.update((s) => ({ ...s, showGrid: value }));
  }

  setShowTooltip(value: boolean): void {
    this.state.update((s) => ({ ...s, showTooltip: value }));
  }

  setExportFormat(value: string): void {
    if (value === 'png' || value === 'jpg' || value === 'svg' || value === 'gif') {
      this.exportFormat.set(value);
    }
  }

  setExportBackgroundId(value: string): void {
    const availableIds = listSharedExportBackgrounds(this.exportFormat()).map((entry) => entry.id);
    if (availableIds.includes(value as SharedExportBackgroundId)) {
      this.exportBackgroundId.set(value as SharedExportBackgroundId);
    }
  }

  setExportSolidColor(value: string): void {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      this.exportSolidColor.set(value);
    }
  }

  setExportQuality(value: string): void {
    if (value === 'low' || value === 'medium' || value === 'high') {
      this.exportQuality.set(value);
    }
  }

  setActiveEditorValue(value: string): void {
    if (this.editorTab() === 'style') {
      this.setStyleJson(value);
      return;
    }

    this.setDataJson(value);
  }

  loadSample(): void {
    const currentPreset = this.preset();
    this.state.update((s) => ({
      ...s,
      dataJson: defaultPresetData(currentPreset),
      styleJson: currentPreset === 'styled' ? defaultStyleMapData() : s.styleJson,
    }));
  }

  renderPlot(): void {
    const config = this.buildPlotConfig();
    if (!config) {
      this.toast.show(this.t.map()['TOAST_PARSE_FAIL'], 'error');
      return;
    }

    this.schemaPopoverOpen.set(false);
    this.lastRenderedConfig.set(config);
    this.isRendering.set(true);
    this.step.set('plot');
    this.toast.show(this.t.map()['TOAST_RENDERED'], 'success');
  }

  openDataMode(): void {
    this.safeDestroyRenderer();
    this.exportModalOpen.set(false);
    this.step.set('editor');
  }

  openExportModal(): void {
    if (!this.renderer) {
      return;
    }

    this.exportModalOpen.set(true);
  }

  closeExportModal(): void {
    this.exportModalOpen.set(false);
  }

  async runExport(): Promise<void> {
    if (!this.renderer) {
      return;
    }

    this.clearExportLoaderCloseTimeout();
    this.exportLoaderState.set('loading');
    this.exportLoaderActive.set(true);

    try {
      const format = this.exportFormat();
      const quality = this.exportQuality();
      const background = this.buildExportBackgroundSpec();

      const qualityMap: Record<ExportQuality, { pixelRatio: number; jpegQuality: number }> = {
        low: { pixelRatio: 1, jpegQuality: 0.82 },
        medium: { pixelRatio: 1.5, jpegQuality: 0.9 },
        high: { pixelRatio: 2, jpegQuality: 0.95 },
      };

      const selectedQuality = qualityMap[quality];
      const result =
        format === 'gif'
          ? await this.renderer.exportGif({
              fps: this.gifFps(),
              durationMs: this.gifDurationMs(),
              maxColors: this.gifMaxColors(),
              background,
            })
          : await this.renderer.exportStatic({
              format,
              pixelRatio: selectedQuality.pixelRatio,
              jpegQuality: selectedQuality.jpegQuality,
              background,
            });

      this.downloadUrl(result.outputUrl, result.filename);
      this.exportModalOpen.set(false);
      this.finishExportLoader('success');
      this.toast.show(this.t.map()['TOAST_EXPORT_OK'], 'success');
    } catch {
      this.finishExportLoader('error');
      this.toast.show(this.t.map()['TOAST_EXPORT_FAIL'], 'error');
    }
  }

  private finishExportLoader(state: Extract<ProcessingLoaderState, 'success' | 'error'>): void {
    this.exportLoaderState.set(state);
    this.exportLoaderCloseTimeout = setTimeout(() => {
      this.exportLoaderActive.set(false);
      this.exportLoaderCloseTimeout = null;
    }, 450);
  }

  private clearExportLoaderCloseTimeout(): void {
    if (!this.exportLoaderCloseTimeout) {
      return;
    }

    clearTimeout(this.exportLoaderCloseTimeout);
    this.exportLoaderCloseTimeout = null;
  }

  private buildPlotConfig(): PrettyPlotConfig | null {
    const preset = this.preset();

    let config: PrettyPlotConfig;
    if (preset === 'single') {
      const parsed = parseSinglePresetInput(this.dataJson());
      if (!parsed.ok || !parsed.value) {
        this.error.set(parsed.error ?? 'Invalid plot data.');
        this.statusText.set(this.t.map()['STATUS_ERROR']);
        return null;
      }

      config = singleSeriesPreset(parsed.value);
    } else {
      const parsed = parseMultiPresetInput(this.dataJson());
      if (!parsed.ok || !parsed.value) {
        this.error.set(parsed.error ?? 'Invalid plot data.');
        this.statusText.set(this.t.map()['STATUS_ERROR']);
        return null;
      }

      config = multiSeriesSharedXPreset(parsed.value);
    }

    if (preset === 'styled') {
      const parsed = parseMultiPresetInput(this.dataJson());
      if (!parsed.ok || !parsed.value) {
        this.error.set(parsed.error ?? 'Invalid plot data.');
        this.statusText.set(this.t.map()['STATUS_ERROR']);
        return null;
      }

      const styleResult = parseStyleMap(this.styleJson());
      if (!styleResult.ok || !styleResult.value) {
        this.error.set(styleResult.error ?? 'Invalid style map.');
        this.statusText.set(this.t.map()['STATUS_ERROR']);
        return null;
      }

      config = multiSeriesStyledPreset(parsed.value, styleResult.value);
    }

    this.error.set(null);

    const isDark = document.documentElement.classList.contains('dark');
    const palette = isDark
      ? [...PRETTY_PLOT_SERIES_PALETTE]
      : ['#0ea5e9', '#059669', '#d97706', '#db2777', '#7c3aed', '#e11d48'];

    config = {
      ...config,
      theme: {
        ...config.theme,
        backgroundColor: isDark ? '#0b1220' : '#f8fafc',
        textColor: isDark ? '#e2e8f0' : '#0f172a',
        axisColor: isDark ? '#94a3b8' : '#64748b',
        gridColor: isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.2)',
        palette,
      },
    };

    return [
      withCurve(this.curve()),
      withGrid(this.showGrid()),
      withTooltip(this.showTooltip()),
      withLabels({ xLabel: this.xLabel(), yLabel: this.yLabel() }),
    ].reduce((current, modifier) => modifier(current), config);
  }

  private safeDestroyRenderer(): void {
    if (!this.renderer) {
      return;
    }

    this.renderer.destroy();
    this.renderer = null;
  }

  private buildExportBackgroundSpec(): SharedExportBackgroundSpec {
    const id = this.exportBackgroundId();
    if (id === 'solid-color') {
      return {
        id,
        color: this.exportSolidColor(),
      };
    }

    return { id };
  }

  private backgroundLabel(id: SharedExportBackgroundId): string {
    if (id === 'app-starfield-dark') {
      return this.t.map()['EXPORT_BG_APP_DARK'];
    }

    if (id === 'app-starfield-light') {
      return this.t.map()['EXPORT_BG_APP_LIGHT'];
    }

    if (id === 'solid-color') {
      return this.t.map()['EXPORT_BG_SOLID'];
    }

    return this.t.map()['EXPORT_BG_TRANSPARENT'];
  }

  private downloadUrl(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);
  }
}
