import {
    Component,
    ElementRef,
    computed,
    effect,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type ApplyScope = 'this' | 'selected' | 'all';

type ResizeMode = 'none' | 'longEdge' | 'exact' | 'percent';
type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

type FilterPreset =
    | 'none'
    | 'sequoia'
    | 'vivid'
    | 'matte'
    | 'vintage'
    | 'bw'
    | 'cool'
    | 'warm';

type Recipe = {
    rotateDeg: number; // continuous degrees; export uses exact rotation
    flipH: boolean;
    flipV: boolean;

    // crop is normalized [0..1] relative to current image dimensions (pre-rotate for simplicity)
    cropEnabled: boolean;
    cropX: number; // 0..1
    cropY: number; // 0..1
    cropW: number; // 0..1
    cropH: number; // 0..1
    cropAspect: 'free' | '1:1' | '4:5' | '16:9' | '3:2';

    // adjustments: -100..100 except gamma 0.2..3.0
    brightness: number;
    contrast: number;
    saturation: number;
    exposure: number;
    gamma: number;

    preset: FilterPreset;
    presetIntensity: number; // 0..100

    blurRadius: number; // 0..20
    sharpenAmount: number; // 0..100
};

type HistoryEntry = {
    groupId: string;
    label: string;
    before: Recipe;
    after: Recipe;
    ts: number;
};

type GlobalOp = {
    groupId: string;
    label: string;
    imageIds: string[];
    ts: number;
};

type ImageItem = {
    id: string;
    name: string;
    file: File;
    objectUrl: string;

    // decoded bitmap cached
    bitmap?: ImageBitmap;

    recipe: Recipe;

    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
    version: number;

    status: 'idle' | 'exporting' | 'done' | 'error';
    error?: string;
};

type ExportSettings = {
    format: ExportFormat;
    quality: number; // 0..1 (for jpeg/webp)
    resizeMode: ResizeMode;
    longEdge: number;
    exactW: number;
    exactH: number;
    percent: number; // 1..400
    filenameTemplate: string; // {originalName}_{index}
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}
function deepCloneRecipe(r: Recipe): Recipe {
    return JSON.parse(JSON.stringify(r)) as Recipe;
}
function uid(prefix = 'img') {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function defaultRecipe(): Recipe {
    return {
        rotateDeg: 0,
        flipH: false,
        flipV: false,

        cropEnabled: false,
        cropX: 0,
        cropY: 0,
        cropW: 1,
        cropH: 1,
        cropAspect: 'free',

        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        gamma: 1,

        preset: 'none',
        presetIntensity: 0,

        blurRadius: 0,
        sharpenAmount: 0
    };
}

function recipeEquals(a: Recipe, b: Recipe): boolean {
    // cheap but robust: stringify small object
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Robust undo/redo model:
 * - Every commit creates a groupId, even single-image.
 * - Each affected image gets one HistoryEntry with that same groupId.
 * - Global stack stores groups; global undo/redo is group-based and serialized.
 */
class HistoryManager {
    private globalUndo = signal<GlobalOp[]>([]);
    private globalRedo = signal<GlobalOp[]>([]);

    globalUndoStack = computed(() => this.globalUndo());
    globalRedoStack = computed(() => this.globalRedo());

    pushGlobal(op: GlobalOp) {
        this.globalUndo.update(s => [...s, op]);
        this.globalRedo.set([]);
    }

    pushGlobalRedo(op: GlobalOp) {
        this.globalRedo.update(s => [...s, op]);
    }

    popGlobalUndo(): GlobalOp | undefined {
        const s = this.globalUndo();
        const op = s[s.length - 1];
        if (!op) return undefined;
        this.globalUndo.set(s.slice(0, -1));
        return op;
    }

    popGlobalRedo(): GlobalOp | undefined {
        const s = this.globalRedo();
        const op = s[s.length - 1];
        if (!op) return undefined;
        this.globalRedo.set(s.slice(0, -1));
        return op;
    }

    /*
    clearRedoAllImages(images: ImageItem[], ids: string[]) {
        for (const id of ids) {
            const img = images.find(i => i.id === id);
            if (img) img.redoStack = [];
        }
    }
    */
}

@Component({
    selector: 'app-advanced-image-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, ToolLayoutComponent],

    providers: [
        provideTranslation({
            en: () => en,
            fr: () => fr,
            es: () => es,
            zh: () => zh
        })
    ],
    template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="advanced-image-editor">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
        <!-- 2x2/3x3 WIDGET MODE (compact full tool with tabs) -->
        <div class="h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
            <!-- Hidden file input for widget -->
            <input #widgetFileInputEl type="file" multiple accept="image/*" class="hidden" (change)="onFilesSelected($event)" />

            <!-- Header (required) -->
            <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-symbols-outlined text-primary">tune</span>
                    <div class="min-w-0">
                        <div class="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-white truncate">
                            {{ t.map()['TITLE'] }}
                        </div>
                        @if (viewMode() === 'expanded') {
                            <div class="text-[11px] text-slate-500 dark:text-slate-300 truncate">
                                {{ t.map()['WIDGET_SUBTITLE'] }}
                            </div>
                        }
                    </div>
                </div>

                <div class="flex items-center gap-1">
                    <button
                            type="button"
                            class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-800"
                            (click)="openWidgetFilePicker()"
                    >
                        {{ t.map()['ADD_IMAGES'] }}
                    </button>
                </div>
            </div>

            <!-- Body: keep footer visible -->
            <div class="flex-1 min-h-0 p-2 grid grid-rows-[minmax(0,1fr)_auto] gap-2">
                @if (images().length === 0) {
                    <button
                            type="button"
                            class="w-full h-full border border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                            (click)="openWidgetFilePicker()"
                            (keydown.enter)="openWidgetFilePicker()"
                            (keydown.space)="openWidgetFilePicker()"
                    >
                        <span class="material-symbols-outlined text-primary text-3xl">add_photo_alternate</span>
                        <div class="text-xs text-slate-600 dark:text-slate-200 text-center px-2">
                            {{ t.map()['WIDGET_EMPTY_HINT'] }}
                        </div>
                    </button>
                } @else {
                    <!-- Main editor area -->
                    <div class="grid grid-cols-[minmax(0,1fr)_140px] gap-2 h-full min-h-0">
                        <!-- Live preview -->
                        <div class="relative rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 overflow-hidden min-h-0">
                            <canvas #widgetPreviewCanvasEl class="absolute inset-0 w-full h-full"></canvas>

                            <div class="absolute left-2 top-2 text-[11px] bg-white/80 dark:bg-slate-900/70 text-slate-800 dark:text-white px-2 py-1 rounded">
                                {{ t.map()['QUEUE'] }}: {{ images().length }}
                            </div>

                            <div class="absolute right-2 top-2 flex gap-1">
                                <button
                                        type="button"
                                        class="px-2 py-1 rounded bg-white/80 dark:bg-slate-900/70 text-slate-800 dark:text-white text-[11px] hover:opacity-90 disabled:opacity-40"
                                        (click)="widgetPrev()"
                                        [disabled]="images().length <= 1"
                                        title="{{ t.map()['WIDGET_PREV'] }}"
                                >
                                    ‹
                                </button>
                                <button
                                        type="button"
                                        class="px-2 py-1 rounded bg-white/80 dark:bg-slate-900/70 text-slate-800 dark:text-white text-[11px] hover:opacity-90 disabled:opacity-40"
                                        (click)="widgetNext()"
                                        [disabled]="images().length <= 1"
                                        title="{{ t.map()['WIDGET_NEXT'] }}"
                                >
                                    ›
                                </button>
                            </div>

                            <div class="absolute left-2 bottom-2 flex gap-1">
                                <button
                                        type="button"
                                        class="px-2 py-1 rounded bg-white/80 dark:bg-slate-900/70 text-slate-800 dark:text-white text-[11px] hover:opacity-90 disabled:opacity-40"
                                        (click)="undoImage()"
                                        [disabled]="!activeImage() || activeImage()!.undoStack.length === 0"
                                >
                                    {{ t.map()['UNDO'] }}
                                </button>
                                <button
                                        type="button"
                                        class="px-2 py-1 rounded bg-white/80 dark:bg-slate-900/70 text-slate-800 dark:text-white text-[11px] hover:opacity-90 disabled:opacity-40"
                                        (click)="redoImage()"
                                        [disabled]="!activeImage() || activeImage()!.redoStack.length === 0"
                                >
                                    {{ t.map()['REDO'] }}
                                </button>
                            </div>
                        </div>

                        <!-- Right panel with tabs -->
                        <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 flex flex-col min-h-0">
                            <!-- Tab bar -->
                            <div class="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                                <button
                                        type="button"
                                        class="py-1 rounded-md text-[11px] font-medium transition-colors"
                                        [class.bg-white]="widgetTab() === 'edit'"
                                        [class.dark:bg-slate-800]="widgetTab() === 'edit'"
                                        [class.text-slate-900]="widgetTab() === 'edit'"
                                        [class.dark:text-white]="widgetTab() === 'edit'"
                                        [class.text-slate-600]="widgetTab() !== 'edit'"
                                        [class.dark:text-slate-300]="widgetTab() !== 'edit'"
                                        (click)="widgetTab.set('edit')"
                                >
                                    {{ t.map()['WIDGET_TAB_EDIT'] }}
                                </button>

                                <button
                                        type="button"
                                        class="py-1 rounded-md text-[11px] font-medium transition-colors"
                                        [class.bg-white]="widgetTab() === 'filters'"
                                        [class.dark:bg-slate-800]="widgetTab() === 'filters'"
                                        [class.text-slate-900]="widgetTab() === 'filters'"
                                        [class.dark:text-white]="widgetTab() === 'filters'"
                                        [class.text-slate-600]="widgetTab() !== 'filters'"
                                        [class.dark:text-slate-300]="widgetTab() !== 'filters'"
                                        (click)="widgetTab.set('filters')"
                                >
                                    {{ t.map()['WIDGET_TAB_FILTERS'] }}
                                </button>

                                <button
                                        type="button"
                                        class="py-1 rounded-md text-[11px] font-medium transition-colors"
                                        [class.bg-white]="widgetTab() === 'export'"
                                        [class.dark:bg-slate-800]="widgetTab() === 'export'"
                                        [class.text-slate-900]="widgetTab() === 'export'"
                                        [class.dark:text-white]="widgetTab() === 'export'"
                                        [class.text-slate-600]="widgetTab() !== 'export'"
                                        [class.dark:text-slate-300]="widgetTab() !== 'export'"
                                        (click)="widgetTab.set('export')"
                                >
                                    {{ t.map()['WIDGET_TAB_EXPORT'] }}
                                </button>
                            </div>

                            <!-- Panel content -->
                            <div class="flex-1 min-h-0 overflow-auto mt-2 space-y-2">
                                @if (widgetTab() === 'edit') {
                                    <div class="text-[11px] font-semibold text-slate-700 dark:text-white">
                                        {{ t.map()['WIDGET_PANEL_EDIT'] }}
                                    </div>

                                    <div class="space-y-2">
                                        <div class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['BRIGHTNESS'] }}</div>
                                        <input type="range" min="-100" max="100" class="w-full accent-primary"
                                               [ngModel]="workingRecipe().brightness"
                                               (ngModelChange)="updateWorking('brightness', $event)"
                                               (change)="commitWorking(t.map()['BRIGHTNESS'])"
                                        />
                                    </div>

                                    <div class="space-y-2">
                                        <div class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['CONTRAST'] }}</div>
                                        <input type="range" min="-100" max="100" class="w-full accent-primary"
                                               [ngModel]="workingRecipe().contrast"
                                               (ngModelChange)="updateWorking('contrast', $event)"
                                               (change)="commitWorking(t.map()['CONTRAST'])"
                                        />
                                    </div>

                                    <div class="space-y-2">
                                        <div class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['SATURATION'] }}</div>
                                        <input type="range" min="-100" max="100" class="w-full accent-primary"
                                               [ngModel]="workingRecipe().saturation"
                                               (ngModelChange)="updateWorking('saturation', $event)"
                                               (change)="commitWorking(t.map()['SATURATION'])"
                                        />
                                    </div>

                                    @if (widgetCols() >= 3 && widgetRows() >= 3) {
                                        <div class="space-y-2">
                                            <div class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['EXPOSURE'] }}</div>
                                            <input type="range" min="-100" max="100" class="w-full accent-primary"
                                                   [ngModel]="workingRecipe().exposure"
                                                   (ngModelChange)="updateWorking('exposure', $event)"
                                                   (change)="commitWorking(t.map()['EXPOSURE'])"
                                            />
                                        </div>

                                        <div class="space-y-2">
                                            <div class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['GAMMA'] }}</div>
                                            <input type="range" min="0.2" max="3.0" step="0.01" class="w-full accent-primary"
                                                   [ngModel]="workingRecipe().gamma"
                                                   (ngModelChange)="updateWorking('gamma', $event)"
                                                   (change)="commitWorking(t.map()['GAMMA'])"
                                            />
                                        </div>
                                    }
                                }

                                @if (widgetTab() === 'filters') {
                                    <div class="text-[11px] font-semibold text-slate-700 dark:text-white">
                                        {{ t.map()['WIDGET_PANEL_FILTERS'] }}
                                    </div>

                                    <label class="text-[11px] text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                                        {{ t.map()['FILTERS'] }}
                                        <select
                                                class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-1 text-[11px] text-slate-700 dark:text-white"
                                                [ngModel]="workingRecipe().preset"
                                                (ngModelChange)="setWidgetPreset($event)"
                                        >
                                            <option value="none">{{ t.map()['NONE'] }}</option>
                                            <option value="sequoia">{{ t.map()['SEQUOIA'] }}</option>
                                            <option value="vivid">{{ t.map()['VIVID'] }}</option>
                                            <option value="matte">{{ t.map()['MATTE'] }}</option>
                                            <option value="vintage">{{ t.map()['VINTAGE'] }}</option>
                                            <option value="bw">{{ t.map()['BW'] }}</option>
                                            <option value="cool">{{ t.map()['COOL'] }}</option>
                                            <option value="warm">{{ t.map()['WARM'] }}</option>
                                        </select>
                                    </label>

                                    <div class="space-y-1">
                                        <div class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['INTENSITY'] }}</div>
                                        <input type="range" min="0" max="100" class="w-full accent-primary"
                                               [ngModel]="workingRecipe().presetIntensity"
                                               (ngModelChange)="updateWorking('presetIntensity', $event)"
                                               (change)="commitWorking(t.map()['INTENSITY'])"
                                        />
                                    </div>

                                    @if (widgetCols() >= 3 && widgetRows() >= 3) {
                                        <div class="space-y-2">
                                            <div class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['BLUR'] }}</div>
                                            <input type="range" min="0" max="20" step="1" class="w-full accent-primary"
                                                   [ngModel]="workingRecipe().blurRadius"
                                                   (ngModelChange)="updateWorking('blurRadius', $event)"
                                                   (change)="commitWorking(t.map()['BLUR'])"
                                            />
                                        </div>

                                        <div class="space-y-2">
                                            <div class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['SHARPEN'] }}</div>
                                            <input type="range" min="0" max="100" step="1" class="w-full accent-primary"
                                                   [ngModel]="workingRecipe().sharpenAmount"
                                                   (ngModelChange)="updateWorking('sharpenAmount', $event)"
                                                   (change)="commitWorking(t.map()['SHARPEN'])"
                                            />
                                        </div>
                                    } @else {
                                        <div class="text-[11px] text-slate-500 dark:text-slate-300">
                                            {{ t.map()['WIDGET_OPEN_TOOL'] }}
                                            <a class="text-primary hover:underline ml-1" href="#/tools/advanced-image-editor">↗</a>
                                        </div>
                                    }
                                }

                                @if (widgetTab() === 'export') {
                                    <div class="text-[11px] font-semibold text-slate-700 dark:text-white">
                                        {{ t.map()['WIDGET_PANEL_EXPORT'] }}
                                    </div>

                                    <label class="text-[11px] text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                                        {{ t.map()['FORMAT'] }}
                                        <select class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 text-slate-700 dark:text-white px-2 py-1 text-[11px]"
                                                [ngModel]="exportSettings().format"
                                                (ngModelChange)="setExportFormat($event)"
                                        >
                                            <option value="image/png">PNG</option>
                                            <option value="image/jpeg">JPEG</option>
                                            <option value="image/webp">WebP</option>
                                        </select>
                                    </label>

                                    <div class="space-y-1">
                                        <div class="text-[11px] text-slate-600 dark:text-slate-200">
                                            {{ t.map()['QUALITY'] }}: {{ Math.round(exportSettings().quality * 100) }}
                                        </div>
                                        <input type="range" min="0.1" max="1" step="0.01" class="w-full accent-primary"
                                               [ngModel]="exportSettings().quality"
                                               (ngModelChange)="setExportQuality($event)"
                                        />
                                    </div>

                                    <label class="text-[11px] text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                                        {{ t.map()['RESIZE'] }}
                                        <select class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 text-slate-700 dark:text-white px-2 py-1 text-[11px]"
                                                [ngModel]="exportSettings().resizeMode"
                                                (ngModelChange)="setResizeMode($event)"
                                        >
                                            <option value="none">{{ t.map()['NO_RESIZE'] }}</option>
                                            <option value="longEdge">{{ t.map()['LONG_EDGE'] }}</option>
                                            <option value="exact">{{ t.map()['EXACT'] }}</option>
                                            <option value="percent">{{ t.map()['PERCENT'] }}</option>
                                        </select>
                                    </label>

                                    @if (exportSettings().resizeMode === 'longEdge') {
                                        <label class="text-[11px] text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                                            {{ t.map()['LONG_EDGE'] }}
                                            <input type="number" min="16" step="1"
                                                   class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-1 text-[11px] text-slate-700 dark:text-white"
                                                   [ngModel]="exportSettings().longEdge"
                                                   (ngModelChange)="setLongEdge($event)"
                                            />
                                        </label>
                                    }

                                    @if (exportSettings().resizeMode === 'exact') {
                                        <div class="grid grid-cols-2 gap-2">
                                            <label class="text-[11px] text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                                                {{ t.map()['WIDTH'] }}
                                                <input type="number" min="1" step="1"
                                                       class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-1 text-[11px] text-slate-700 dark:text-white"
                                                       [ngModel]="exportSettings().exactW"
                                                       (ngModelChange)="setExactW($event)"
                                                />
                                            </label>
                                            <label class="text-[11px] text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                                                {{ t.map()['HEIGHT'] }}
                                                <input type="number" min="1" step="1"
                                                       class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-1 text-[11px] text-slate-700 dark:text-white"
                                                       [ngModel]="exportSettings().exactH"
                                                       (ngModelChange)="setExactH($event)"
                                                />
                                            </label>
                                        </div>
                                    }

                                    @if (exportSettings().resizeMode === 'percent') {
                                        <label class="text-[11px] text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                                            {{ t.map()['PERCENTAGE'] }}
                                            <input type="number" min="1" max="400" step="1"
                                                   class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-1 text-[11px] text-slate-700 dark:text-white"
                                                   [ngModel]="exportSettings().percent"
                                                   (ngModelChange)="setPercent($event)"
                                            />
                                        </label>
                                    }

                                    <label class="text-[11px] text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                                        {{ t.map()['FILENAME_TEMPLATE'] }}
                                        <input
                                                class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-1 text-[11px] text-slate-700 dark:text-white"
                                                [ngModel]="exportSettings().filenameTemplate"
                                                (ngModelChange)="setFilenameTemplate($event)"
                                        />
                                        <span class="text-[10px] text-slate-500 dark:text-slate-300">
                    Tokens: {{ '{originalName}' }} {{ '{index}' }}
                  </span>
                                    </label>

                                    <div class="grid grid-cols-2 gap-2 pt-1">
                                        <button
                                                type="button"
                                                class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                                                (click)="export(false)"
                                                [disabled]="exportJob().running"
                                        >
                                            {{ t.map()['WIDGET_EXPORT_SELECTED'] }}
                                        </button>

                                        <button
                                                type="button"
                                                class="px-2 py-2 rounded-lg bg-primary text-white hover:opacity-90 text-[11px]"
                                                (click)="export(true)"
                                                [disabled]="exportJob().running"
                                        >
                                            {{ t.map()['WIDGET_EXPORT_ALL'] }}
                                        </button>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Footer: add-more + optional open tool -->
                    <div class="grid grid-cols-2 gap-2 shrink-0">
                        <button
                                type="button"
                                class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                                (click)="openWidgetFilePicker()"
                        >
                            {{ t.map()['WIDGET_ADD_MORE'] }}
                        </button>

                        <a
                                class="px-3 py-2 rounded-lg bg-slate-900 text-white dark:bg-slate-700 hover:opacity-90 text-xs text-center"
                                href="#/tools/advanced-image-editor"
                                title="{{ t.map()['WIDGET_OPEN_TOOL'] }}"
                        >
                            {{ t.map()['WIDGET_OPEN_TOOL'] }}
                        </a>
                    </div>
                }
            </div>
        </div>
    }



    <ng-template #mainContent>
      <div class="min-h-[520px] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
        <!-- Top bar -->
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">tune</span>
            <div>
              <div class="text-base font-semibold text-slate-800 dark:text-white">{{ t.map()['TITLE'] }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-300">{{ t.map()['DESC'] }}</div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"
              (click)="undoGlobal()"
              [disabled]="history.globalUndoStack().length === 0"
            >
              <span class="material-symbols-outlined text-base">undo</span>
              {{ t.map()['UNDO'] }}
            </button>

            <button
              class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"
              (click)="redoGlobal()"
              [disabled]="history.globalRedoStack().length === 0"
            >
              <span class="material-symbols-outlined text-base">redo</span>
              {{ t.map()['REDO'] }}
            </button>

            <button
              class="px-3 py-2 rounded-lg bg-primary text-white hover:opacity-90 flex items-center gap-2 text-sm"
              (click)="fileInput().nativeElement.click()"
            >
              <span class="material-symbols-outlined text-base">add_photo_alternate</span>
              {{ t.map()['ADD_IMAGES'] }}
            </button>

            <button
              class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"
              (click)="clearAll()"
              [disabled]="images().length === 0"
            >
              <span class="material-symbols-outlined text-base">delete</span>
              {{ t.map()['CLEAR'] }}
            </button>

            <input #fileInputEl type="file" multiple accept="image/*" class="hidden" (change)="onFilesSelected($event)" />
          </div>
        </div>

        <!-- Main 3-column layout -->
        <div class="mt-3 grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-3">
          <!-- Left: Queue -->
          <div
            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-2 flex flex-col min-h-[260px]"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event)"
          >
            <div class="flex items-center justify-between pb-2">
              <div class="text-sm font-semibold text-slate-700 dark:text-white">{{ t.map()['QUEUE'] }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-300">{{ images().length }}</div>
            </div>

            @if (images().length === 0) {
                <button
                        type="button"
                        class="flex-1 w-full border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-center justify-center text-center hover:bg-white dark:hover:bg-slate-800"
                        (click)="openFilePicker()"
                >
                    <div>
                        <span class="material-symbols-outlined text-primary text-3xl">upload</span>
                        <div class="text-xs text-slate-600 dark:text-slate-200 mt-1">{{ t.map()['DROP_HINT'] }}</div>
                    </div>
                </button>
            } @else {
              <div class="flex-1 overflow-auto pr-1 space-y-2">
                @for (img of images(); track img.id) {
                  <button
                    class="w-full text-left rounded-lg border p-2 flex gap-2 items-center
                           hover:bg-white dark:hover:bg-slate-800
                           {{ img.id === activeId() ? 'border-primary bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60' }}"
                    (click)="setActive(img.id)"
                  >
                    <img [src]="img.objectUrl" class="w-10 h-10 rounded object-cover border border-slate-200 dark:border-slate-700" />
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-medium text-slate-700 dark:text-white truncate">{{ img.name }}</div>
                      <div class="text-[11px] text-slate-500 dark:text-slate-300 flex items-center gap-1">
                        @if (img.status === 'exporting') { <span>{{ t.map()['STATUS_EXPORTING'] }}</span> }
                        @if (img.status === 'done') { <span>{{ t.map()['STATUS_DONE'] }}</span> }
                        @if (img.status === 'error') { <span class="text-red-600 dark:text-red-400">{{ t.map()['STATUS_ERROR'] }}</span> }
                        <span class="opacity-60">v{{ img.version }}</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      class="accent-primary"
                      [checked]="selectedIds().has(img.id)"
                      (click)="$event.stopPropagation()"
                      (change)="toggleSelected(img.id)"
                    />
                  </button>
                }
              </div>
            }

            <div class="pt-2 flex gap-2">
              <button
                class="flex-1 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-800 text-xs"
                (click)="selectAll(true)"
                [disabled]="images().length === 0"
              >
                {{ t.map()['ALL'] }}
              </button>
                <!--
              <button
                class="flex-1 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-800 text-xs"
                (click)="selectAll(false)"
                [disabled]="images().length === 0"
              >
                {{ t.map()['SELECTED'] }}
              </button>
              -->
            </div>
          </div>

          <!-- Center: Preview -->
          <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 flex flex-col min-h-[320px]">
            <div class="flex items-center justify-between pb-2">
              <div class="text-sm font-semibold text-slate-700 dark:text-white">{{ t.map()['PREVIEW'] }}</div>
              <div class="flex items-center gap-2">
                <button class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700" (click)="fitPreview()">
                  {{ t.map()['FIT'] }}
                </button>
                <button class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700" (click)="zoom(-0.1)">
                  {{ t.map()['ZOOM_OUT'] }}
                </button>
                <button class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700" (click)="zoom(0.1)">
                  {{ t.map()['ZOOM_IN'] }}
                </button>
                <button
                  class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                  (click)="toggleBeforeAfter()"
                  [disabled]="!activeImage()"
                >
                  {{ t.map()['BEFORE_AFTER'] }}
                </button>
              </div>
            </div>

            <div class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 relative overflow-hidden">
              <canvas
                #previewCanvasEl
                class="absolute inset-0 w-full h-full"
                (pointerdown)="onCanvasPointerDown($event)"
                (pointermove)="onCanvasPointerMove($event)"
                (pointerup)="onCanvasPointerUp($event)"
                (pointercancel)="onCanvasPointerUp($event)"
              ></canvas>

              @if (cropUi().enabled && cropUi().dragging) {
                <div class="absolute top-2 left-2 text-[11px] bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-white px-2 py-1 rounded">
                  {{ t.map()['CROP'] }}: {{ cropUi().x.toFixed(0) }},{{ cropUi().y.toFixed(0) }} — {{ cropUi().w.toFixed(0) }}×{{ cropUi().h.toFixed(0) }}
                </div>
              }

              @if (!activeImage()) {
                <div class="absolute inset-0 flex items-center justify-center text-center p-6">
                  <div class="text-slate-500 dark:text-slate-300 text-sm">{{ t.map()['EMPTY_QUEUE'] }}</div>
                </div>
              }
            </div>
          </div>

          <!-- Right: Editor panel -->
          <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 flex flex-col min-h-[320px]">
            <div class="flex items-center justify-between pb-2">
              <div class="text-sm font-semibold text-slate-700 dark:text-white">{{ activeName() }}</div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['APPLY_TO'] }}</label>
                <select
                  class="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 text-slate-700 dark:text-white px-2 py-1"
                  [(ngModel)]="applyScopeModel"
                  (ngModelChange)="applyScope.set($event)"
                >
                  <option value="this">{{ t.map()['THIS_IMAGE'] }}</option>
                  <!-- <option value="selected">{{ t.map()['SELECTED'] }}</option> -->
                  <option value="all">{{ t.map()['ALL'] }}</option>
                </select>
              </div>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 pb-2">
              @for (tab of tabs; track tab.id) {
                <button
                  class="flex-1 px-2 py-2 rounded-lg text-xs border
                         {{ activeTab() === tab.id ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700' }}"
                  (click)="activeTab.set(tab.id)"
                >
                  {{ t.map()[tab.labelKey] }}
                </button>
              }
            </div>

            <div class="flex-1 overflow-auto pr-1">
              @if (!activeImage()) {
                <div class="text-sm text-slate-500 dark:text-slate-300 p-3">{{ t.map()['EMPTY_QUEUE'] }}</div>
              } @else {
                @if (activeTab() === 'adjust') {
                  <div class="space-y-3 p-1">
                    <div class="grid grid-cols-2 gap-2">
                      <button class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                        (click)="undoImage()"
                        [disabled]="activeImage()!.undoStack.length === 0"
                      >
                        {{ t.map()['UNDO'] }} (img)
                      </button>
                      <button class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                        (click)="redoImage()"
                        [disabled]="activeImage()!.redoStack.length === 0"
                      >
                        {{ t.map()['REDO'] }} (img)
                      </button>
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['BRIGHTNESS'] }}: {{ workingRecipe().brightness }}</label>
                      <input type="range" min="-100" max="100" [ngModel]="workingRecipe().brightness"
                        (ngModelChange)="updateWorking('brightness', $event)" (change)="commitWorking('Brightness')"
                        class="w-full accent-primary" />
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['CONTRAST'] }}: {{ workingRecipe().contrast }}</label>
                      <input type="range" min="-100" max="100" [ngModel]="workingRecipe().contrast"
                        (ngModelChange)="updateWorking('contrast', $event)" (change)="commitWorking('Contrast')"
                        class="w-full accent-primary" />
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['SATURATION'] }}: {{ workingRecipe().saturation }}</label>
                      <input type="range" min="-100" max="100" [ngModel]="workingRecipe().saturation"
                        (ngModelChange)="updateWorking('saturation', $event)" (change)="commitWorking('Saturation')"
                        class="w-full accent-primary" />
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['EXPOSURE'] }}: {{ workingRecipe().exposure }}</label>
                      <input type="range" min="-100" max="100" [ngModel]="workingRecipe().exposure"
                        (ngModelChange)="updateWorking('exposure', $event)" (change)="commitWorking('Exposure')"
                        class="w-full accent-primary" />
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['GAMMA'] }}: {{ workingRecipe().gamma.toFixed(2) }}</label>
                      <input type="range" min="0.2" max="3.0" step="0.01" [ngModel]="workingRecipe().gamma"
                        (ngModelChange)="updateWorking('gamma', $event)" (change)="commitWorking('Gamma')"
                        class="w-full accent-primary" />
                    </div>

                    <button
                      class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                      (click)="resetAllEdits()"
                    >
                      {{ t.map()['RESET_ALL'] }}
                    </button>
                  </div>
                }

                @if (activeTab() === 'crop') {
                  <div class="space-y-3 p-1">
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                        (click)="enterCropBatch()"
                      >
                        {{ t.map()['CROP_MODE_BATCH'] }}
                      </button>
                      <button
                        class="px-2 py-2 rounded-lg bg-primary text-white hover:opacity-90 text-xs"
                        (click)="enterCropSequential()"
                        [disabled]="images().length === 0"
                      >
                        {{ t.map()['CROP_MODE_SEQUENTIAL'] }}
                      </button>
                    </div>

                    <div class="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                      <div class="flex items-center justify-between">
                        <div class="text-xs font-semibold text-slate-700 dark:text-white">{{ t.map()['CROP'] }}</div>
                        <label class="text-xs text-slate-600 dark:text-slate-200 flex items-center gap-2">
                          <input type="checkbox" class="accent-primary" [checked]="workingRecipe().cropEnabled"
                            (change)="updateWorking('cropEnabled', $any($event.target).checked); commitWorking('Crop enabled')" />
                          on
                        </label>
                      </div>

                      <div class="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label class="text-[11px] text-slate-600 dark:text-slate-200">{{ t.map()['ASPECT'] }}</label>
                          <select
                            class="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 text-slate-700 dark:text-white px-2 py-2"
                            [ngModel]="workingRecipe().cropAspect"
                            (ngModelChange)="setCropAspect($event)"
                          >
                            <option value="free">{{ t.map()['FREE'] }}</option>
                            <option value="1:1">1:1</option>
                            <option value="4:5">4:5</option>
                            <option value="3:2">3:2</option>
                            <option value="16:9">16:9</option>
                          </select>
                        </div>
                        <div class="flex items-end">
                          <button class="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                            (click)="resetCrop()"
                          >
                            {{ t.map()['RESET_CROP'] }}
                          </button>
                        </div>
                      </div>

                      <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-white">
                        <label class="flex flex-col gap-1">
                          X
                          <input class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2"
                            type="number" step="0.01" min="0" max="1"
                            [ngModel]="workingRecipe().cropX"
                            (ngModelChange)="updateWorking('cropX', clamp($event,0,1)); commitWorking('Crop X')" />
                        </label>
                        <label class="flex flex-col gap-1">
                          Y
                          <input class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2"
                            type="number" step="0.01" min="0" max="1"
                            [ngModel]="workingRecipe().cropY"
                            (ngModelChange)="updateWorking('cropY', clamp($event,0,1)); commitWorking('Crop Y')" />
                        </label>
                        <label class="flex flex-col gap-1">
                          W
                          <input class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2"
                            type="number" step="0.01" min="0.01" max="1"
                            [ngModel]="workingRecipe().cropW"
                            (ngModelChange)="updateWorking('cropW', clamp($event,0.01,1)); commitWorking('Crop W')" />
                        </label>
                        <label class="flex flex-col gap-1">
                          H
                          <input class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2"
                            type="number" step="0.01" min="0.01" max="1"
                            [ngModel]="workingRecipe().cropH"
                            (ngModelChange)="updateWorking('cropH', clamp($event,0.01,1)); commitWorking('Crop H')" />
                        </label>
                      </div>

                      <div class="mt-2 grid grid-cols-2 gap-2">
                        <button
                          class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                          (click)="rotate(-90)"
                        >
                          <span class="material-symbols-outlined text-base">rotate_left</span>
                          {{ t.map()['ROTATE_LEFT'] }}
                        </button>
                        <button
                          class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                          (click)="rotate(90)"
                        >
                          <span class="material-symbols-outlined text-base">rotate_right</span>
                          {{ t.map()['ROTATE_RIGHT'] }}
                        </button>
                      </div>

                      <div class="mt-2 grid grid-cols-2 gap-2">
                        <button class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                          (click)="toggleFlip('h')"
                        >
                          {{ t.map()['FLIP_H'] }}
                        </button>
                        <button class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                          (click)="toggleFlip('v')"
                        >
                          {{ t.map()['FLIP_V'] }}
                        </button>
                      </div>

                      @if (cropSequential().active) {
                        <div class="mt-3 rounded-lg border border-primary bg-primary/10 p-2">
                          <div class="text-xs font-semibold text-slate-800 dark:text-white">
                            {{ t.map()['CROP_MODE_SEQUENTIAL'] }} —
                            {{ cropSequential().index + 1 }}/{{ cropSequential().ids.length }}
                          </div>
                          <div class="mt-2 grid grid-cols-3 gap-2">
                            <button class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700"
                              (click)="seqBack()"
                              [disabled]="cropSequential().index === 0"
                            >
                              {{ t.map()['BACK'] }}
                            </button>
                            <button class="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700"
                              (click)="seqSkip()"
                            >
                              {{ t.map()['SKIP'] }}
                            </button>
                            <button class="px-2 py-2 rounded-lg bg-primary text-white hover:opacity-90 text-xs"
                              (click)="seqApplyNext()"
                            >
                              {{ t.map()['APPLY_NEXT'] }}
                            </button>
                          </div>
                          <button class="mt-2 w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700"
                            (click)="seqDone()"
                          >
                            {{ t.map()['DONE'] }}
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (activeTab() === 'filters') {
                  <div class="space-y-3 p-1">
                    <div class="text-xs font-semibold text-slate-700 dark:text-white">{{ t.map()['FILTER_PRESETS'] }}</div>
                    <div class="grid grid-cols-2 gap-2">
                      @for (p of presetCards; track p.id) {
                        <button
                          class="px-2 py-2 rounded-lg border text-xs
                                 {{ workingRecipe().preset === p.id ? 'border-primary bg-primary/10 text-slate-800 dark:text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700' }}"
                          (click)="setPreset(p.id)"
                        >
                          {{ t.map()[p.labelKey] }}
                        </button>
                      }
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['INTENSITY'] }}: {{ workingRecipe().presetIntensity }}</label>
                      <input type="range" min="0" max="100" [ngModel]="workingRecipe().presetIntensity"
                        (ngModelChange)="updateWorking('presetIntensity', $event)" (change)="commitWorking('Preset intensity')"
                        class="w-full accent-primary" />
                    </div>

                    <div class="rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-3">
                      <div class="text-xs font-semibold text-slate-700 dark:text-white">{{ t.map()['BLUR'] }} / {{ t.map()['SHARPEN'] }}</div>

                      <div class="space-y-2">
                        <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['BLUR_RADIUS'] }}: {{ workingRecipe().blurRadius }}</label>
                        <input type="range" min="0" max="20" step="1" [ngModel]="workingRecipe().blurRadius"
                          (ngModelChange)="updateWorking('blurRadius', $event)" (change)="commitWorking('Blur')"
                          class="w-full accent-primary" />
                      </div>

                      <div class="space-y-2">
                        <label class="text-xs text-slate-600 dark:text-slate-200">{{ t.map()['SHARPEN_AMOUNT'] }}: {{ workingRecipe().sharpenAmount }}</label>
                        <input type="range" min="0" max="100" step="1" [ngModel]="workingRecipe().sharpenAmount"
                          (ngModelChange)="updateWorking('sharpenAmount', $event)" (change)="commitWorking('Sharpen')"
                          class="w-full accent-primary" />
                      </div>
                    </div>
                  </div>
                }

                @if (activeTab() === 'export') {
                  <div class="space-y-3 p-1">
                    <div class="grid grid-cols-2 gap-2">
                      <label class="text-xs text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                        {{ t.map()['FORMAT'] }}
                        <select class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 text-slate-700 dark:text-white px-2 py-2 text-xs"
                          [ngModel]="exportSettings().format"
                                (ngModelChange)="setExportFormat($event)"
                        >
                          <option value="image/png">PNG</option>
                          <option value="image/jpeg">JPEG</option>
                          <option value="image/webp">WebP</option>
                        </select>
                      </label>

                      <label class="text-xs text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                        {{ t.map()['QUALITY'] }}: {{ Math.round(exportSettings().quality * 100) }}
                        <input type="range" min="0.1" max="1" step="0.01" class="accent-primary"
                          [ngModel]="exportSettings().quality"
                               (ngModelChange)="setExportQuality($event)"
                        />
                      </label>
                    </div>

                    <label class="text-xs text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                      {{ t.map()['RESIZE'] }}
                      <select class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 text-slate-700 dark:text-white px-2 py-2 text-xs"
                        [ngModel]="exportSettings().resizeMode"
                              (ngModelChange)="setResizeMode($event)"
                      >
                        <option value="none">{{ t.map()['NO_RESIZE'] }}</option>
                        <option value="longEdge">{{ t.map()['LONG_EDGE'] }}</option>
                        <option value="exact">{{ t.map()['EXACT'] }}</option>
                        <option value="percent">{{ t.map()['PERCENT'] }}</option>
                      </select>
                    </label>

                    @if (exportSettings().resizeMode === 'longEdge') {
                      <label class="text-xs text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                        {{ t.map()['LONG_EDGE'] }}
                        <input type="number" min="16" step="1"
                          class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2 text-xs text-slate-700 dark:text-white"
                          [ngModel]="exportSettings().longEdge"
                               (ngModelChange)="setLongEdge($event)"
                        />
                      </label>
                    }

                    @if (exportSettings().resizeMode === 'exact') {
                      <div class="grid grid-cols-2 gap-2">
                        <label class="text-xs text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                          {{ t.map()['WIDTH'] }}
                          <input type="number" min="1" step="1"
                            class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2 text-xs text-slate-700 dark:text-white"
                            [ngModel]="exportSettings().exactW"
                                 (ngModelChange)="setExactW($event)"
                          />
                        </label>
                        <label class="text-xs text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                          {{ t.map()['HEIGHT'] }}
                          <input type="number" min="1" step="1"
                            class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2 text-xs text-slate-700 dark:text-white"
                            [ngModel]="exportSettings().exactH"
                                 (ngModelChange)="setExactH($event)"
                          />
                        </label>
                      </div>
                    }

                    @if (exportSettings().resizeMode === 'percent') {
                      <label class="text-xs text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                        {{ t.map()['PERCENTAGE'] }}
                        <input type="number" min="1" max="400" step="1"
                          class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2 text-xs text-slate-700 dark:text-white"
                          [ngModel]="exportSettings().percent"
                               (ngModelChange)="setPercent($event)"

                        />
                      </label>
                    }

                    <label class="text-xs text-slate-600 dark:text-slate-200 flex flex-col gap-1">
                      {{ t.map()['FILENAME_TEMPLATE'] }}
                      <input
                        class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/30 px-2 py-2 text-xs text-slate-700 dark:text-white"
                        [ngModel]="exportSettings().filenameTemplate"
                        (ngModelChange)="setFilenameTemplate($event)"

                      />
                        <span class="text-[11px] text-slate-500 dark:text-slate-300">
                          Tokens: {{ '{originalName}' }} {{ '{index}' }}
                        </span>

                    </label>

                    <div class="grid grid-cols-2 gap-2 pt-1">
                      <!--
                      <button
                        class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                        (click)="export(false)"
                        [disabled]="exportJob().running || selectedIds().size === 0"
                      >
                        {{ t.map()['EXPORT_SELECTED'] }}
                      </button>
                      -->
                      <button
                        class="px-3 py-2 rounded-lg bg-primary text-white hover:opacity-90 text-sm"
                        (click)="export(true)"
                        [disabled]="exportJob().running || images().length === 0"
                      >
                        {{ t.map()['EXPORT_ALL'] }}
                      </button>
                    </div>

                    @if (exportJob().running) {
                      <div class="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                        <div class="flex items-center justify-between">
                          <div class="text-xs text-slate-600 dark:text-slate-200">
                            {{ exportJob().label }} ({{ exportJob().done }}/{{ exportJob().total }})
                          </div>
                          <button class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                            (click)="cancelExport()"
                          >
                            {{ t.map()['CANCEL'] }}
                          </button>
                        </div>
                        <div class="mt-2 w-full h-2 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div class="h-2 bg-primary" [style.width.%]="exportProgressPercent()"></div>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `
})


export class AdvancedImageEditorComponent {
    // Required inputs (WidgetHost injects these)
    isWidget = input<boolean>(false);
    widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

    widgetTab = signal<WidgetTab>('edit');

    t = inject(ScopedTranslationService);

    clamp = clamp;

    // Template refs
    fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInputEl');
    widgetFileInput = viewChild<ElementRef<HTMLInputElement>>('widgetFileInputEl');

    previewCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('previewCanvasEl');
    widgetPreviewCanvas = viewChild<ElementRef<HTMLCanvasElement>>('widgetPreviewCanvasEl');


    // UI
    tabs = [
        { id: 'adjust', labelKey: 'ADJUST' },
        { id: 'crop', labelKey: 'CROP_ROTATE' },
        { id: 'filters', labelKey: 'FILTERS' },
        { id: 'export', labelKey: 'EXPORT' }
    ] as const;

    presetCards: { id: FilterPreset; labelKey: keyof ReturnType<ScopedTranslationService['map']> }[] = [
        { id: 'none', labelKey: 'NONE' },
        { id: 'sequoia', labelKey: 'SEQUOIA' },
        { id: 'vivid', labelKey: 'VIVID' },
        { id: 'matte', labelKey: 'MATTE' },
        { id: 'vintage', labelKey: 'VINTAGE' },
        { id: 'bw', labelKey: 'BW' },
        { id: 'cool', labelKey: 'COOL' },
        { id: 'warm', labelKey: 'WARM' }
    ];

    // State
    images = signal<ImageItem[]>([]);
    activeId = signal<string | null>(null);
    selectedIds = signal<Set<string>>(new Set<string>());

    applyScope = signal<ApplyScope>('this');
    // ngModel helper
    applyScopeModel: ApplyScope = 'this';

    activeTab = signal<'adjust' | 'crop' | 'filters' | 'export'>('adjust');

    // working recipe is edited live; commits are grouped
    workingRecipe = signal<Recipe>(defaultRecipe());

    // Preview controls
    previewZoom = signal<number>(1);
    beforeAfter = signal<boolean>(false); // if true, show "before" (no edits)

    // Crop interaction (on-canvas drag for quick batch crop)
    cropUi = signal<{ enabled: boolean; dragging: boolean; x: number; y: number; w: number; h: number; startX: number; startY: number }>({
        enabled: false,
        dragging: false,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        startX: 0,
        startY: 0
    });

    cropSequential = signal<{ active: boolean; ids: string[]; index: number }>({
        active: false,
        ids: [],
        index: 0
    });

    // Export
    exportSettings = signal<ExportSettings>({
        format: 'image/png',
        quality: 0.92,
        resizeMode: 'none',
        longEdge: 1600,
        exactW: 1920,
        exactH: 1080,
        percent: 100,
        filenameTemplate: '{originalName}_edited_{index}'
    });

    exportJob = signal<{ running: boolean; total: number; done: number; cancel: boolean; label: string }>({
        running: false,
        total: 0,
        done: 0,
        cancel: false,
        label: ''
    });

    history = new HistoryManager();

    // Derived
    activeImage = computed(() => {
        const id = this.activeId();
        if (!id) return null;
        return this.images().find(i => i.id === id) ?? null;
    });

    activeName = computed(() => this.activeImage()?.name ?? '');


    viewMode = computed(() => {
        const config = this.widgetConfig();
        const c = config?.cols ?? 1;
        const r = config?.rows ?? 1;
        if (c >= 3 && r >= 3) return 'expanded';
        return 'default';
    });

    exportProgressPercent = computed(() => {
        const j = this.exportJob();
        if (!j.running || j.total <= 0) return 0;
        return Math.round((j.done / j.total) * 100);
    });

    // Render pipeline effects (preview)
    private renderTick = signal<number>(0);

    constructor() {
        // When active image changes, load its recipe into workingRecipe
        effect(() => {
            const img = this.activeImage();
            if (!img) return;
            this.workingRecipe.set(deepCloneRecipe(img.recipe));
            this.beforeAfter.set(false);
            this.fitPreview();
            this.ensureBitmapLoaded(img).then(() => this.bumpRender());
        });

        // When working recipe changes, render preview (debounced)
        let timer: ReturnType<typeof setTimeout> | null = null;
        effect(() => {
            const img = this.activeImage();
            this.workingRecipe();
            this.previewZoom();
            this.beforeAfter();
            this.renderTick(); // allow manual bump
            if (!img) return;

            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                this.ensureBitmapLoaded(img)
                    .then(() => this.isWidget() ? this.renderWidgetPreview(img) : this.renderPreview(img))
                    .catch(() => {});
            }, 30);
        });
    }

    // --------------------------
    // Queue / selection
    // --------------------------
    private isLikelyImageFile(f: File): boolean {
        if (f.type && f.type.startsWith('image/')) return true;

        // Fallback: some environments return empty MIME type. Use extension.
        const name = (f.name ?? '').toLowerCase();
        return /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(name);
    }

    async onFilesSelected(ev: Event) {
        const input = ev.target as HTMLInputElement;

        const picked = Array.from(input.files ?? []);
        // Important: reset input so selecting the same file again triggers change
        input.value = '';

        const files = picked.filter(f => this.isLikelyImageFile(f));
        if (files.length === 0) return;

        await this.addFiles(files);
    }

    onDragOver(ev: DragEvent) {
        ev.preventDefault();
    }

    async onDrop(ev: DragEvent) {
        ev.preventDefault();
        const files = Array.from(ev.dataTransfer?.files ?? []).filter(f => this.isLikelyImageFile(f));
        if (files.length === 0) return;
        await this.addFiles(files);
    }

    setExportFormat(v: ExportFormat) {
        this.exportSettings.update(s => ({ ...s, format: v }));
    }
    setExportQuality(v: number) {
        this.exportSettings.update(s => ({ ...s, quality: v }));
    }
    setResizeMode(v: ResizeMode) {
        this.exportSettings.update(s => ({ ...s, resizeMode: v }));
    }
    setLongEdge(v: number) {
        this.exportSettings.update(s => ({ ...s, longEdge: Number(v) }));
    }
    setExactW(v: number) {
        this.exportSettings.update(s => ({ ...s, exactW: Number(v) }));
    }
    setExactH(v: number) {
        this.exportSettings.update(s => ({ ...s, exactH: Number(v) }));
    }
    setPercent(v: number) {
        this.exportSettings.update(s => ({ ...s, percent: Number(v) }));
    }
    setFilenameTemplate(v: string) {
        this.exportSettings.update(s => ({ ...s, filenameTemplate: v }));
    }

    private async addFiles(files: File[]) {
        const next: ImageItem[] = [];
        for (const f of files) {
            const id = uid('img');
            const objectUrl = URL.createObjectURL(f);
            next.push({
                id,
                name: f.name,
                file: f,
                objectUrl,
                recipe: defaultRecipe(),
                undoStack: [],
                redoStack: [],
                version: 0,
                status: 'idle'
            });
        }

        this.images.update(s => [...s, ...next]);
        // Auto-select + set active
        this.selectedIds.update(sel => {
            const s = new Set(sel);
            for (const n of next) s.add(n.id);
            return s;
        });
        if (!this.activeId() && next.length > 0) this.setActive(next[0].id);
    }

    openFilePicker() {
        this.fileInput().nativeElement.click();
    }

    openWidgetFilePicker() {
        const ref = this.widgetFileInput();
        if (ref) ref.nativeElement.click();
    }



    clearAll() {
        for (const img of this.images()) {
            try {
                URL.revokeObjectURL(img.objectUrl);
            } catch {}
            try {
                img.bitmap?.close();
            } catch (err) {
                console.error('Failed to revoke object URL for image', img.id, img.name, err);
            }
            try {
                img.bitmap?.close();
            } catch (err) {
                console.error('Failed to close bitmap for image', img.id, img.name, err);
            }
        }
        this.images.set([]);
        this.activeId.set(null);
        this.selectedIds.set(new Set());
        this.workingRecipe.set(defaultRecipe());
    }

    setActive(id: string) {
        this.activeId.set(id);
    }

    toggleSelected(id: string) {
        this.selectedIds.update(s => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    }

    selectAll(all: boolean) {
        if (all) {
            this.selectedIds.set(new Set(this.images().map(i => i.id)));
        } else {
            // keep current selection (button exists mainly as quick hint in UI)
            // no-op by design
            this.selectedIds.set(new Set(this.selectedIds()));
        }
    }

    // --------------------------
    // Preview controls
    // --------------------------
    fitPreview() {
        this.previewZoom.set(1);
        this.bumpRender();
    }

    zoom(delta: number) {
        this.previewZoom.update(z => clamp(z + delta, 0.25, 4));
    }

    toggleBeforeAfter() {
        this.beforeAfter.update(v => !v);
    }

    private bumpRender() {
        this.renderTick.update(v => v + 1);
    }

    widgetPrev() {
        const list = this.images();
        if (list.length <= 1) return;

        const current = this.activeId();
        const idx = Math.max(0, list.findIndex(i => i.id === current));
        const next = (idx - 1 + list.length) % list.length;
        this.setActive(list[next].id);
    }

    widgetNext() {
        const list = this.images();
        if (list.length <= 1) return;

        const current = this.activeId();
        const idx = Math.max(0, list.findIndex(i => i.id === current));
        const next = (idx + 1) % list.length;
        this.setActive(list[next].id);
    }


    // --------------------------
    // Working recipe edits
    // --------------------------
    updateWorking<K extends keyof Recipe>(key: K, value: Recipe[K]) {
        this.workingRecipe.update(r => ({ ...r, [key]: value }));
    }

    commitWorking(label: string) {
        const img = this.activeImage();
        if (!img) return;

        const before = img.recipe;
        const after = this.workingRecipe();

        if (recipeEquals(before, after)) return;

        const groupId = uid('op');
        this.commitOperation(groupId, label, this.scopeImageIds(), () => {
            // For scoped commit, each image gets the same "after" recipe,
            // but based on its current recipe for a robust before snapshot.
            // When applying across many, this is deterministic and conflict-free
            // because commits are serialized through commitOperation.
            return deepCloneRecipe(after);
        });
    }

    resetAllEdits() {
        const groupId = uid('op');
        this.commitOperation(groupId, 'Reset all', this.scopeImageIds(), () => defaultRecipe());
    }

    // --------------------------
    // Crop / rotate helpers
    // --------------------------
    rotate(deltaDeg: number) {
        const r = this.workingRecipe();
        this.workingRecipe.set({ ...r, rotateDeg: ((r.rotateDeg + deltaDeg) % 360 + 360) % 360 });
        this.commitWorking(deltaDeg > 0 ? 'Rotate right' : 'Rotate left');
    }

    toggleFlip(axis: 'h' | 'v') {
        const r = this.workingRecipe();
        if (axis === 'h') this.workingRecipe.set({ ...r, flipH: !r.flipH });
        else this.workingRecipe.set({ ...r, flipV: !r.flipV });
        this.commitWorking(axis === 'h' ? 'Flip H' : 'Flip V');
    }

    setCropAspect(aspect: Recipe['cropAspect']) {
        const r = this.workingRecipe();
        const next = { ...r, cropAspect: aspect };
        // If fixed aspect, gently normalize H based on W (or vice versa) without being destructive:
        if (aspect !== 'free') {
            const [aw, ah] = aspect.split(':').map(Number);
            const target = aw / ah;
            const w = clamp(next.cropW, 0.01, 1);
            next.cropH = clamp(w / target, 0.01, 1);
            next.cropEnabled = true;
        }
        this.workingRecipe.set(next);
        this.commitWorking('Crop aspect');
    }

    resetCrop() {
        const r = this.workingRecipe();
        this.workingRecipe.set({ ...r, cropEnabled: false, cropX: 0, cropY: 0, cropW: 1, cropH: 1, cropAspect: 'free' });
        this.commitWorking('Reset crop');
    }

    enterCropBatch() {
        // Enable crop UI rectangle on canvas as a fast batch tool
        this.cropUi.set({ enabled: true, dragging: false, x: 0, y: 0, w: 0, h: 0, startX: 0, startY: 0 });
    }

    enterCropSequential() {
        const ids = this.scopeIdsForSequentialCrop();
        if (ids.length === 0) return;
        this.cropSequential.set({ active: true, ids, index: 0 });
        this.setActive(ids[0]);
        this.cropUi.set({ enabled: true, dragging: false, x: 0, y: 0, w: 0, h: 0, startX: 0, startY: 0 });
    }

    private scopeIdsForSequentialCrop(): string[] {
        // Sequential crop makes most sense over selected/all (not "this")
        const scope = this.applyScope();
        if (scope === 'all') return this.images().map(i => i.id);
        if (scope === 'selected') return Array.from(this.selectedIds()).filter(id => this.images().some(i => i.id === id));
        // "this"
        return this.activeId() ? [this.activeId()!] : [];
    }

    seqApplyNext() {
        const seq = this.cropSequential();
        if (!seq.active) return;

        // Apply current working crop settings to current image (commit as group-of-one)
        this.commitWorking('Sequential crop');

        const nextIndex = seq.index + 1;
        if (nextIndex >= seq.ids.length) {
            this.seqDone();
            return;
        }
        this.cropSequential.set({ ...seq, index: nextIndex });
        this.setActive(seq.ids[nextIndex]);
    }

    seqSkip() {
        const seq = this.cropSequential();
        if (!seq.active) return;
        const nextIndex = seq.index + 1;
        if (nextIndex >= seq.ids.length) {
            this.seqDone();
            return;
        }
        this.cropSequential.set({ ...seq, index: nextIndex });
        this.setActive(seq.ids[nextIndex]);
    }

    seqBack() {
        const seq = this.cropSequential();
        if (!seq.active) return;
        const prevIndex = Math.max(0, seq.index - 1);
        this.cropSequential.set({ ...seq, index: prevIndex });
        this.setActive(seq.ids[prevIndex]);
    }

    seqDone() {
        this.cropSequential.set({ active: false, ids: [], index: 0 });
        this.cropUi.set({ enabled: false, dragging: false, x: 0, y: 0, w: 0, h: 0, startX: 0, startY: 0 });
    }

    // Canvas crop drag: updates normalized crop coords to workingRecipe
    onCanvasPointerDown(ev: PointerEvent) {
        if (!this.cropUi().enabled) return;
        if (!this.activeImage()) return;

        const rect = this.previewCanvas().nativeElement.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        this.previewCanvas().nativeElement.setPointerCapture(ev.pointerId);

        this.cropUi.set({ ...this.cropUi(), dragging: true, startX: x, startY: y, x, y, w: 0, h: 0 });
    }

    onCanvasPointerMove(ev: PointerEvent) {
        const c = this.cropUi();
        if (!c.enabled || !c.dragging) return;

        const rect = this.previewCanvas().nativeElement.getBoundingClientRect();
        const x2 = ev.clientX - rect.left;
        const y2 = ev.clientY - rect.top;

        const x = Math.min(c.startX, x2);
        const y = Math.min(c.startY, y2);
        const w = Math.abs(x2 - c.startX);
        const h = Math.abs(y2 - c.startY);

        this.cropUi.set({ ...c, x, y, w, h });

        // live update normalized crop in working recipe using preview-space mapping
        const norm = this.previewRectToNormalizedCrop(x, y, w, h);
        if (!norm) return;
        this.workingRecipe.update(r => ({
            ...r,
            cropEnabled: true,
            cropX: norm.x,
            cropY: norm.y,
            cropW: norm.w,
            cropH: norm.h
        }));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onCanvasPointerUp(ev: PointerEvent) {
        const c = this.cropUi();
        if (!c.enabled || !c.dragging) return;
        this.cropUi.set({ ...c, dragging: false });
        // commit once at release (robust undo)
        this.commitWorking('Crop');
    }

    private previewRectToNormalizedCrop(x: number, y: number, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
        const img = this.activeImage();
        if (!img?.bitmap) return null;

        // We render preview with "fit" into canvas; compute rendered image box
        const canvas = this.previewCanvas().nativeElement;
        const cw = canvas.width;
        const ch = canvas.height;

        const bmpW = img.bitmap.width;
        const bmpH = img.bitmap.height;

        const zoom = this.previewZoom();

        const scale = Math.min(cw / bmpW, ch / bmpH) * zoom;
        const rw = bmpW * scale;
        const rh = bmpH * scale;
        const ox = (cw - rw) / 2;
        const oy = (ch - rh) / 2;

        // clamp to rendered image box
        const rx = clamp((x - ox) / rw, 0, 1);
        const ry = clamp((y - oy) / rh, 0, 1);
        const rwN = clamp(w / rw, 0.01, 1);
        const rhN = clamp(h / rh, 0.01, 1);

        return {
            x: rx,
            y: ry,
            w: rwN,
            h: rhN
        };
    }

    // --------------------------
    // Filters
    // --------------------------
    setPreset(preset: FilterPreset) {
        this.workingRecipe.update(r => ({
            ...r,
            preset,
            presetIntensity: preset === 'none' ? 0 : Math.max(r.presetIntensity, 50)
        }));
        this.commitWorking('Preset');
    }

    setWidgetPreset(preset: FilterPreset) {
        // If user selects a preset (not none) and intensity is 0, bump to a sensible default
        this.workingRecipe.update(r => {
            const nextIntensity =
                preset === 'none' ? 0 : (r.presetIntensity > 0 ? r.presetIntensity : 70);

            return {
                ...r,
                preset,
                presetIntensity: nextIntensity
            };
        });

        this.commitWorking(this.t.map()['WIDGET_LABEL_PRESET']);
    }


    // --------------------------
    // Undo/redo
    // --------------------------
    undoImage() {
        const img = this.activeImage();
        if (!img) return;
        const entry = img.undoStack.pop();
        if (!entry) return;
        img.redoStack.push(entry);
        img.recipe = deepCloneRecipe(entry.before);
        img.version++;
        this.workingRecipe.set(deepCloneRecipe(img.recipe));
        this.bumpRender();
    }

    redoImage() {
        const img = this.activeImage();
        if (!img) return;
        const entry = img.redoStack.pop();
        if (!entry) return;
        img.undoStack.push(entry);
        img.recipe = deepCloneRecipe(entry.after);
        img.version++;
        this.workingRecipe.set(deepCloneRecipe(img.recipe));
        this.bumpRender();
    }

    undoGlobal() {
        const op = this.history.popGlobalUndo();
        if (!op) return;

        // serialize over images (no parallel writes => no race conditions)
        for (const id of op.imageIds) {
            const img = this.images().find(i => i.id === id);
            if (!img) continue;

            // find last matching history entry for this group
            const idx = [...img.undoStack].reverse().findIndex(e => e.groupId === op.groupId);
            if (idx < 0) continue;

            const realIndex = img.undoStack.length - 1 - idx;
            const entry = img.undoStack.splice(realIndex, 1)[0];
            img.redoStack.push(entry);
            img.recipe = deepCloneRecipe(entry.before);
            img.version++;
        }

        this.history.pushGlobalRedo(op);

        // refresh active working recipe if needed
        const a = this.activeImage();
        if (a) this.workingRecipe.set(deepCloneRecipe(a.recipe));
        this.bumpRender();
    }

    redoGlobal() {
        const op = this.history.popGlobalRedo();
        if (!op) return;

        for (const id of op.imageIds) {
            const img = this.images().find(i => i.id === id);
            if (!img) continue;

            // find last matching redo entry for this group
            const idx = [...img.redoStack].reverse().findIndex(e => e.groupId === op.groupId);
            if (idx < 0) continue;

            const realIndex = img.redoStack.length - 1 - idx;
            const entry = img.redoStack.splice(realIndex, 1)[0];
            img.undoStack.push(entry);
            img.recipe = deepCloneRecipe(entry.after);
            img.version++;
        }

        this.history.pushGlobal(op);

        const a = this.activeImage();
        if (a) this.workingRecipe.set(deepCloneRecipe(a.recipe));
        this.bumpRender();
    }

    // --------------------------
    // Commit engine (single writer)
    // --------------------------
    private scopeImageIds(): string[] {
        const scope = this.applyScope();
        const imgs = this.images();
        if (scope === 'this') return this.activeId() ? [this.activeId()!] : [];
        if (scope === 'all') return imgs.map(i => i.id);
        // selected
        const sel = this.selectedIds();
        return imgs.map(i => i.id).filter(id => sel.has(id));
    }

    private commitOperation(groupId: string, label: string, imageIds: string[], buildAfter: (img: ImageItem) => Recipe) {
        if (imageIds.length === 0) return;

        const imgs = this.images();

        const affected: string[] = [];
        for (const id of imageIds) {
            const img = imgs.find(i => i.id === id);
            if (!img) continue;

            const before = deepCloneRecipe(img.recipe);
            const after = buildAfter(img);

            if (recipeEquals(before, after)) continue;

            img.undoStack.push({
                groupId,
                label,
                before,
                after: deepCloneRecipe(after),
                ts: Date.now()
            });
            img.redoStack = [];
            img.recipe = deepCloneRecipe(after);
            img.version++;
            affected.push(id);
        }

        if (affected.length > 0) {
            this.history.pushGlobal({ groupId, label, imageIds: affected, ts: Date.now() });

            // If the active image was affected, sync working recipe
            const a = this.activeImage();
            if (a && affected.includes(a.id)) {
                this.workingRecipe.set(deepCloneRecipe(a.recipe));
            }
            this.bumpRender();
        }
    }

    // --------------------------
    // Rendering pipeline
    // --------------------------
    private async ensureBitmapLoaded(img: ImageItem) {
        if (img.bitmap) return;
        img.bitmap = await createImageBitmap(img.file);
    }

    private async renderPreview(img: ImageItem) {
        const canvas = this.previewCanvas().nativeElement;
        const rect = canvas.getBoundingClientRect();

        // Keep canvas backing size in sync (crisp rendering)
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.floor(rect.width * dpr));
        const h = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx || !img.bitmap) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render edited or before state
        const recipe = this.beforeAfter() ? defaultRecipe() : this.workingRecipe();

        // Preview render is downscaled to fit; we use a single offscreen canvas render
        const out = await this.renderToCanvas(img.bitmap, recipe, canvas.width, canvas.height, true);

        ctx.drawImage(out, 0, 0);

        // Draw crop overlay if enabled (visual only)
        if (this.cropUi().enabled && recipe.cropEnabled) {
            this.drawCropOverlay(ctx, canvas.width, canvas.height, img.bitmap.width, img.bitmap.height, recipe);
        } else if (this.cropUi().enabled && this.cropUi().dragging) {
            // draw temporary rectangle
            const c = this.cropUi();
            ctx.save();
            ctx.strokeStyle = 'rgba(99,102,241,0.95)'; // indigo-ish, matches primary vibe
            ctx.lineWidth = Math.max(2, Math.floor(2 * dpr));
            ctx.setLineDash([6 * dpr, 4 * dpr]);
            ctx.strokeRect(c.x * dpr, c.y * dpr, c.w * dpr, c.h * dpr);
            ctx.restore();
        }
    }

    private async renderWidgetPreview(img: ImageItem) {
        const ref = this.widgetPreviewCanvas();
        if (!ref) return;

        const canvas = ref.nativeElement;
        const rect = canvas.getBoundingClientRect();

        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.floor(rect.width * dpr));
        const h = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx || !img.bitmap) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const recipe = this.beforeAfter() ? defaultRecipe() : this.workingRecipe();
        const out = await this.renderToCanvas(img.bitmap, recipe, canvas.width, canvas.height, true);
        ctx.drawImage(out, 0, 0);
    }


    private drawCropOverlay(
        ctx: CanvasRenderingContext2D,
        cw: number,
        ch: number,
        bmpW: number,
        bmpH: number,
        recipe: Recipe
    ) {
        // Compute rendered image box in canvas for overlay mapping (same math as previewRectToNormalizedCrop)
        const zoom = this.previewZoom();
        const scale = Math.min(cw / bmpW, ch / bmpH) * zoom;
        const rw = bmpW * scale;
        const rh = bmpH * scale;
        const ox = (cw - rw) / 2;
        const oy = (ch - rh) / 2;

        const x = ox + recipe.cropX * rw;
        const y = oy + recipe.cropY * rh;
        const w = recipe.cropW * rw;
        const h = recipe.cropH * rh;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, cw, ch);
        ctx.clearRect(x, y, w, h);

        ctx.strokeStyle = 'rgba(99,102,241,0.95)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, w, h);

        // rule of thirds
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w / 3, y);
        ctx.lineTo(x + w / 3, y + h);
        ctx.moveTo(x + (2 * w) / 3, y);
        ctx.lineTo(x + (2 * w) / 3, y + h);
        ctx.moveTo(x, y + h / 3);
        ctx.lineTo(x + w, y + h / 3);
        ctx.moveTo(x, y + (2 * h) / 3);
        ctx.lineTo(x + w, y + (2 * h) / 3);
        ctx.stroke();

        ctx.restore();
    }

    private async renderToCanvas(
        bitmap: ImageBitmap,
        recipe: Recipe,
        targetW: number,
        targetH: number,
        preview: boolean
    ): Promise<HTMLCanvasElement> {
        // Step 1: draw bitmap with rotate/flip into an intermediate offscreen
        const srcW = bitmap.width;
        const srcH = bitmap.height;

        // intermediate canvas at "preview scale" for responsiveness
        // for export, we'll render at true size later
        const scale = preview ? Math.min(targetW / srcW, targetH / srcH) : 1;
        const iW = Math.max(1, Math.floor(srcW * scale));
        const iH = Math.max(1, Math.floor(srcH * scale));

        const c1 = document.createElement('canvas');
        c1.width = iW;
        c1.height = iH;
        const c1ctx = c1.getContext('2d')!;
        c1ctx.clearRect(0, 0, iW, iH);

        // rotate around center
        const rad = (recipe.rotateDeg * Math.PI) / 180;
        c1ctx.save();
        c1ctx.translate(iW / 2, iH / 2);
        c1ctx.rotate(rad);
        c1ctx.scale(recipe.flipH ? -1 : 1, recipe.flipV ? -1 : 1);
        c1ctx.drawImage(bitmap, -iW / 2, -iH / 2, iW, iH);
        c1ctx.restore();

        // Step 2: crop (normalized coords based on original pre-rotate space; for simplicity this crops the rotated result box)
        let c2 = c1;
        if (recipe.cropEnabled) {
            const cx = clamp(recipe.cropX, 0, 1);
            const cy = clamp(recipe.cropY, 0, 1);
            const cw = clamp(recipe.cropW, 0.01, 1);
            const ch = clamp(recipe.cropH, 0.01, 1);

            const sx = Math.floor(cx * c1.width);
            const sy = Math.floor(cy * c1.height);
            const sw = Math.floor(cw * c1.width);
            const sh = Math.floor(ch * c1.height);

            const cc = document.createElement('canvas');
            cc.width = Math.max(1, sw);
            cc.height = Math.max(1, sh);
            const ccx = cc.getContext('2d')!;
            ccx.drawImage(c1, sx, sy, sw, sh, 0, 0, cc.width, cc.height);
            c2 = cc;
        }

        // Step 3: filters & adjustments:
        // - use canvas filter for blur/brightness/contrast/saturation (fast)
        // - then do lightweight pixel step for gamma/exposure + preset toning
        const c3 = document.createElement('canvas');
        c3.width = c2.width;
        c3.height = c2.height;
        const c3ctx = c3.getContext('2d')!;

        // CSS-like filter chain
        const brightness = 1 + recipe.brightness / 100;
        const contrast = 1 + recipe.contrast / 100;
        const saturate = 1 + recipe.saturation / 100;

        const blur = clamp(recipe.blurRadius, 0, 20);
        c3ctx.filter = `blur(${blur}px) brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
        c3ctx.drawImage(c2, 0, 0);
        c3ctx.filter = 'none';

        // Pixel adjustments (gamma/exposure + preset)
        const imgData = c3ctx.getImageData(0, 0, c3.width, c3.height);
        this.applyPixelAdjustments(imgData, recipe);
        c3ctx.putImageData(imgData, 0, 0);

        // Sharpen pass (simple convolution; skip if preview and large to keep smooth)
        if (recipe.sharpenAmount > 0) {
            const allowSharpen = preview ? (c3.width * c3.height <= 900 * 900) : true;
            if (allowSharpen) {
                this.applySharpen(c3ctx, c3.width, c3.height, recipe.sharpenAmount);
            }
        }

        // Step 4: Fit result into target canvas (for preview)
        if (preview) {
            const out = document.createElement('canvas');
            out.width = targetW;
            out.height = targetH;
            const outCtx = out.getContext('2d')!;
            outCtx.clearRect(0, 0, targetW, targetH);

            const zoom = this.previewZoom();
            const scale2 = Math.min(targetW / c3.width, targetH / c3.height) * zoom;
            const rw = c3.width * scale2;
            const rh = c3.height * scale2;
            const ox = (targetW - rw) / 2;
            const oy = (targetH - rh) / 2;

            outCtx.drawImage(c3, ox, oy, rw, rh);
            return out;
        }

        return c3;
    }

    private applyPixelAdjustments(img: ImageData, recipe: Recipe) {
        const d = img.data;
        const gamma = clamp(recipe.gamma, 0.2, 3.0);

        // exposure: treat as multiplicative gain
        const exposureGain = Math.pow(2, recipe.exposure / 50); // -100..100 => ~0.25..4

        // preset toning
        const preset = recipe.preset;
        const intensity = clamp(recipe.presetIntensity / 100, 0, 1);

        for (let i = 0; i < d.length; i += 4) {
            let r = d[i] / 255;
            let g = d[i + 1] / 255;
            let b = d[i + 2] / 255;

            // exposure
            r *= exposureGain;
            g *= exposureGain;
            b *= exposureGain;

            // gamma
            r = Math.pow(clamp(r, 0, 1), 1 / gamma);
            g = Math.pow(clamp(g, 0, 1), 1 / gamma);
            b = Math.pow(clamp(b, 0, 1), 1 / gamma);

            // preset (kept intentionally simple + robust)
            if (preset !== 'none' && intensity > 0) {
                const toned = this.applyPresetTone(r, g, b, preset);
                r = r * (1 - intensity) + toned.r * intensity;
                g = g * (1 - intensity) + toned.g * intensity;
                b = b * (1 - intensity) + toned.b * intensity;
            }

            d[i] = Math.round(clamp(r, 0, 1) * 255);
            d[i + 1] = Math.round(clamp(g, 0, 1) * 255);
            d[i + 2] = Math.round(clamp(b, 0, 1) * 255);
            // alpha unchanged
        }
    }

    private applyPresetTone(r: number, g: number, b: number, preset: FilterPreset) {
        // Tiny, deterministic transforms (no LUT dependency, robust offline).
        const mix = (a: number, target: number, t: number) => a * (1 - t) + target * t;

        if (preset === 'bw') {
            const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            return { r: l, g: l, b: l };
        }

        if (preset === 'vivid') {
            // mild contrast curve + saturation-like push via channel separation
            const curve = (x: number) => clamp((x - 0.5) * 1.2 + 0.5, 0, 1);
            return { r: curve(r * 1.05), g: curve(g), b: curve(b * 1.05) };
        }

        if (preset === 'matte') {
            // lift blacks, soften highlights
            const lift = (x: number) => clamp(0.08 + x * 0.92, 0, 1);
            return { r: lift(r), g: lift(g), b: lift(b) };
        }

        if (preset === 'vintage') {
            // slight sepia
            const tr = clamp(0.393 * r + 0.769 * g + 0.189 * b, 0, 1);
            const tg = clamp(0.349 * r + 0.686 * g + 0.168 * b, 0, 1);
            const tb = clamp(0.272 * r + 0.534 * g + 0.131 * b, 0, 1);
            return { r: tr, g: tg, b: tb };
        }

        if (preset === 'cool') {
            return { r: mix(r, r * 0.95, 0.6), g, b: mix(b, Math.min(1, b * 1.1), 0.6) };
        }

        if (preset === 'warm') {
            return { r: mix(r, Math.min(1, r * 1.1), 0.6), g, b: mix(b, b * 0.95, 0.6) };
        }

        if (preset === 'sequoia') {
            // earthy: warm shadows + matte-ish
            const lift = (x: number) => clamp(0.06 + x * 0.94, 0, 1);
            const rr = lift(mix(r, Math.min(1, r * 1.08), 0.7));
            const gg = lift(mix(g, g * 0.98, 0.5));
            const bb = lift(mix(b, b * 0.92, 0.7));
            return { r: rr, g: gg, b: bb };
        }

        return { r, g, b };
    }

    private applySharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
        // Simple 3x3 sharpen kernel blend:
        // kernel: [ 0,-1,0, -1,5,-1, 0,-1,0 ] blended by amount
        const src = ctx.getImageData(0, 0, w, h);
        const dst = ctx.createImageData(w, h);

        const s = src.data;
        const d = dst.data;

        const a = clamp(amount / 100, 0, 1);

        const idx = (x: number, y: number) => (y * w + x) * 4;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = idx(x, y);

                // borders: copy
                if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
                    d[i] = s[i];
                    d[i + 1] = s[i + 1];
                    d[i + 2] = s[i + 2];
                    d[i + 3] = s[i + 3];
                    continue;
                }

                const c = idx(x, y);
                const up = idx(x, y - 1);
                const dn = idx(x, y + 1);
                const lf = idx(x - 1, y);
                const rt = idx(x + 1, y);

                for (let ch = 0; ch < 3; ch++) {
                    const val =
                        5 * s[c + ch] -
                        1 * s[up + ch] -
                        1 * s[dn + ch] -
                        1 * s[lf + ch] -
                        1 * s[rt + ch];
                    d[i + ch] = s[c + ch] * (1 - a) + clamp(val, 0, 255) * a;
                }
                d[i + 3] = s[i + 3];
            }
        }

        ctx.putImageData(dst, 0, 0);
    }

    // --------------------------
    // Export pipeline (snapshot + sequential)
    // --------------------------
    cancelExport() {
        this.exportJob.update(j => ({ ...j, cancel: true }));
    }

    async export(all: boolean) {
        const ids = all ? this.images().map(i => i.id) : Array.from(this.selectedIds());
        const targets = this.images().filter(i => ids.includes(i.id));
        if (targets.length === 0) return;

        // Snapshot to avoid conflicts while user keeps editing
        const snapshot = targets.map(i => ({ id: i.id, name: i.name, file: i.file, recipe: deepCloneRecipe(i.recipe), version: i.version }));

        this.exportJob.set({ running: true, total: snapshot.length, done: 0, cancel: false, label: 'Export' });

        // Mark statuses
        this.images.update(list =>
            list.map(img => (ids.includes(img.id) ? { ...img, status: 'exporting', error: undefined } : img))
        );

        try {
            for (let i = 0; i < snapshot.length; i++) {
                const job = this.exportJob();
                if (job.cancel) break;

                const s = snapshot[i];
                try {
                    const bitmap = await createImageBitmap(s.file);
                    const blob = await this.renderForExport(bitmap, s.recipe, this.exportSettings());
                    bitmap.close();

                    const filename = this.makeFilename(s.name, i + 1, this.exportSettings().format);
                    this.downloadBlob(blob, filename);

                    this.images.update(list =>
                        list.map(img => (img.id === s.id ? { ...img, status: 'done' } : img))
                    );
                } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    this.images.update(list =>
                        list.map(img => (img.id === s.id ? { ...img, status: 'error', error: errorMessage } : img))
                    );
                }

                this.exportJob.update(j => ({ ...j, done: j.done + 1 }));
            }
        } finally {
            this.exportJob.update(j => ({ ...j, running: false }));
        }
    }

    private async renderForExport(bitmap: ImageBitmap, recipe: Recipe, settings: ExportSettings): Promise<Blob> {
        // Render at full-ish internal resolution then resize if needed
        // Start with full bitmap render (not preview)

        let outCanvas = await this.renderToCanvas(bitmap, recipe, bitmap.width, bitmap.height, false);

        // resize
        const mode = settings.resizeMode;
        if (mode !== 'none') {
            const { w, h } = this.computeResize(outCanvas.width, outCanvas.height, settings);
            const resized = document.createElement('canvas');
            resized.width = w;
            resized.height = h;
            const rctx = resized.getContext('2d')!;
            rctx.imageSmoothingEnabled = true;
            rctx.imageSmoothingQuality = 'high';
            rctx.drawImage(outCanvas, 0, 0, w, h);
            outCanvas = resized;
        }

        const mime = settings.format;
        const quality = mime === 'image/png' ? undefined : clamp(settings.quality, 0.1, 1);

        return await new Promise((resolve, reject) => {
            outCanvas.toBlob(
                b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
                mime,
                quality
            );
        });
    }

    private computeResize(srcW: number, srcH: number, s: ExportSettings): { w: number; h: number } {
        if (s.resizeMode === 'percent') {
            const f = clamp(s.percent, 1, 400) / 100;
            return { w: Math.max(1, Math.round(srcW * f)), h: Math.max(1, Math.round(srcH * f)) };
        }

        if (s.resizeMode === 'exact') {
            return { w: Math.max(1, Math.round(s.exactW)), h: Math.max(1, Math.round(s.exactH)) };
        }

        if (s.resizeMode === 'longEdge') {
            const le = Math.max(16, Math.round(s.longEdge));
            const long = Math.max(srcW, srcH);
            const f = le / long;
            return { w: Math.max(1, Math.round(srcW * f)), h: Math.max(1, Math.round(srcH * f)) };
        }

        return { w: srcW, h: srcH };
    }

    private makeFilename(originalName: string, index: number, format: ExportFormat): string {
        const base = originalName.replace(/\.[^/.]+$/, '');
        const tmpl = this.exportSettings().filenameTemplate || '{originalName}_{index}';
        const ext = format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp';
        const safe = tmpl
            .replaceAll('{originalName}', base)
            .replaceAll('{index}', String(index).padStart(2, '0'))
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
        return `${safe}.${ext}`;
    }

    private downloadBlob(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    protected readonly Math = Math;
}

type WidgetTab = 'edit' | 'filters' | 'export';