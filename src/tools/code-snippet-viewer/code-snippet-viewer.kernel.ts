import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-julia';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-ocaml';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-yaml';
import {
  detectLanguageWithHighlight,
  getPrettierParser,
  getPrismLanguageId,
  normalizeResolvedLanguageAlias,
  SUPPORTED_RESOLVED_SNIPPET_LANGUAGES,
} from './code-snippet-viewer.language-extension';
import { encodeGifWithRuntimeWorker } from '../../core/workers/gif/gif-encoder.runtime';

/*
 * ============================================================================
 * Public API Types (Important first)
 * ============================================================================
 */

export type SnippetLanguage =
  | 'auto'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'html'
  | 'css'
  | 'python'
  | 'java'
  | 'sql'
  | 'bash'
  | 'yaml'
  | 'markdown'
  | 'csharp'
  | 'ocaml'
  | 'julia'
  | 'plaintext';

export type ResolvedSnippetLanguage = Exclude<SnippetLanguage, 'auto'>;

export type ExportTheme = 'dark' | 'light';

export type ExportFormat = 'png' | 'jpg' | 'svg' | 'gif';

export type ExportPresetId =
  | 'instagram-square'
  | 'instagram-portrait'
  | 'instagram-story'
  | 'linkedin-feed'
  | 'x-landscape'
  | 'custom';

export interface HighlightResult {
  language: ResolvedSnippetLanguage;
  html: string;
}

export interface DetectionCandidate {
  language: ResolvedSnippetLanguage;
  score: number;
}

export interface DetectionResult {
  language: ResolvedSnippetLanguage;
  confidence: number;
  reason: 'auto' | 'manual';
  candidates: DetectionCandidate[];
}

export interface BeautifyResult {
  success: boolean;
  language: ResolvedSnippetLanguage;
  code: string;
  changed: boolean;
  error: string | null;
}

export interface WidthEstimateOptions {
  minWidth?: number;
  maxWidth?: number;
}

export interface BeautifyOptions {
  printWidth?: number;
  tabWidth?: number;
  singleQuote?: boolean;
  semi?: boolean;
}

export interface FitSnippetOptions {
  targetWidthPx: number;
  targetHeightPx: number;
  selectedLanguage?: string;
  minPrintWidth?: number;
  maxPrintWidth?: number;
  maxIterations?: number;
  minFontSizePx?: number;
  maxFontSizePx?: number;
}

interface ExportLayoutOptimizationOptions {
  selectedLanguage?: string;
  minCardWidthPx: number;
  maxCardWidthPx: number;
  minCardHeightPx: number;
  maxCardHeightPx: number;
  contentPaddingX: number;
  contentPaddingY: number;
  minCodeUtilization: number;
  maxWrapGrowth: number;
  minPrintWidth?: number;
  maxPrintWidth?: number;
  minFontSizePx?: number;
  maxFontSizePx?: number;
}

interface ExportLayoutOptimizationResult {
  fit: FitSnippetResult;
  cardWidthPx: number;
  cardHeightPx: number;
  utilizationX: number;
  wrapGrowth: number;
  score: number;
}

export interface FitSnippetResult {
  success: boolean;
  language: ResolvedSnippetLanguage;
  code: string;
  printWidth: number;
  fontSizePx: number;
  widthPx: number;
  heightPx: number;
  overflowX: boolean;
  overflowY: boolean;
  iterations: number;
  error: string | null;
}

export interface ExportPreset {
  id: ExportPresetId;
  width: number;
  height: number;
  outerPadding: number;
  minCardWidthRatio: number;
  maxCardWidthRatio: number;
  minCardHeightRatio: number;
  maxCardHeightRatio: number;
  minCodeUtilization: number;
  maxWrapGrowth: number;
  minFontSizePx: number;
  maxFontSizePx: number;
}

export interface BuildExportSceneOptions {
  presetId?: ExportPresetId;
  customWidth?: number;
  customHeight?: number;
  theme?: ExportTheme;
}

export interface ExportSceneModel {
  presetId: ExportPresetId;
  width: number;
  height: number;
  outerPadding: number;
  cardWidth: number;
  cardHeight: number;
  theme: ExportTheme;
  backgroundClass: 'app-universe-bg';
}

export interface PrepareStaticExportOptions extends BuildExportSceneOptions {
  format: Exclude<ExportFormat, 'gif'>;
  selectedLanguage?: string;
  withTitle?: boolean;
  title?: string;
}

export interface PreparedSnippet {
  language: ResolvedSnippetLanguage;
  confidence: number;
  code: string;
  highlightedHtml: string;
  fontSizePx: number;
  printWidth: number;
  widthPx: number;
  heightPx: number;
}

export interface StaticExportPlan {
  format: Exclude<ExportFormat, 'gif'>;
  mimeType: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  filename: string;
  scene: ExportSceneModel;
  snippet: PreparedSnippet;
  withTitle: boolean;
  title: string;
}

export interface GifFrameInput {
  rgba: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  delayMs?: number;
}

export interface GifEncodeOptions {
  repeat?: number;
  maxColors?: number;
  quantizeFormat?: 'rgb565' | 'rgb444';
  paletteSampleFrames?: number;
  paletteTargetPixelsPerFrame?: number;
  antiBanding?: boolean;
  antiBandingStrength?: number;
}

export interface GifEncodeResult {
  blob: Blob;
  bytes: Uint8Array;
  frameCount: number;
  width: number;
  height: number;
  durationMs: number;
}

export { SUPPORTED_RESOLVED_SNIPPET_LANGUAGES };

/*
 * ============================================================================
 * Public Facade Class
 * ============================================================================
 */

export class CodeSnippetKernel {
  private readonly detection = new LanguageDetectionEngine();
  private readonly beautifier = new BeautifyEngine();
  private readonly fitEngine = new SnippetFitEngine(this.beautifier, this.detection);
  private readonly exportScene = new ExportSceneEngine();
  private readonly gifEncoder = new GifAnimationEncoder();

  normalizeLanguage(value: string): SnippetLanguage {
    return normalizeLanguage(value);
  }

  detectLanguage(code: string): DetectionResult {
    return this.detection.detect(code);
  }

  resolveLanguage(code: string, selected: string): ResolvedSnippetLanguage {
    return this.detection.resolve(code, selected).language;
  }

  highlightSnippet(code: string, selected: string): HighlightResult {
    const resolved = this.detection.resolve(code, selected);
    const prismId = getPrismLanguageId(resolved.language);
    const grammar = Prism.languages[prismId];

    if (!grammar) {
      return { language: 'plaintext', html: escapeHtml(code) };
    }

    return {
      language: resolved.language,
      html: Prism.highlight(code, grammar, prismId),
    };
  }

  async beautifySnippet(
    code: string,
    selected: string,
    options: BeautifyOptions = {},
  ): Promise<BeautifyResult> {
    const resolved = this.detection.resolve(code, selected);
    return this.beautifier.beautify(code, resolved.language, options);
  }

  async beautifyAndFit(code: string, options: FitSnippetOptions): Promise<FitSnippetResult> {
    return this.fitEngine.fit(code, {
      ...options,
      selectedLanguage: options.selectedLanguage ?? 'auto',
    });
  }

  estimateSnippetWidth(code: string, options: WidthEstimateOptions = {}): number {
    return estimateSnippetWidth(code, options);
  }

  buildExportScene(code: string, options: BuildExportSceneOptions = {}): ExportSceneModel {
    return this.exportScene.buildScene(code, options);
  }

  async prepareStaticExport(
    code: string,
    options: PrepareStaticExportOptions,
  ): Promise<StaticExportPlan> {
    const preset = resolvePreset(options);
    const detection = this.detection.resolve(code, options.selectedLanguage ?? 'auto');

    const maxCardWidth = Math.floor(preset.width * preset.maxCardWidthRatio);
    const minCardWidth = Math.floor(preset.width * preset.minCardWidthRatio);
    const minCardHeight = Math.floor(preset.height * preset.minCardHeightRatio);
    const maxCardHeight = Math.floor(preset.height * preset.maxCardHeightRatio);

    const optimized = await this.fitEngine.optimizeForExport(code, {
      selectedLanguage: detection.language,
      minCardWidthPx: minCardWidth,
      maxCardWidthPx: maxCardWidth,
      minCardHeightPx: minCardHeight,
      maxCardHeightPx: maxCardHeight,
      contentPaddingX: 36,
      contentPaddingY: (options.withTitle ? 41 : 0) + 30,
      minCodeUtilization: preset.minCodeUtilization,
      maxWrapGrowth: preset.maxWrapGrowth,
      minPrintWidth: 26,
      maxPrintWidth: 120,
      minFontSizePx: preset.minFontSizePx,
      maxFontSizePx: preset.maxFontSizePx,
    });

    const scene: ExportSceneModel = {
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
      outerPadding: preset.outerPadding,
      cardWidth: optimized.cardWidthPx,
      cardHeight: optimized.cardHeightPx,
      theme: options.theme ?? 'dark',
      backgroundClass: 'app-universe-bg',
    };

    const highlighted = this.highlightSnippet(optimized.fit.code, detection.language);

    return {
      format: options.format,
      mimeType: formatToMimeType(options.format),
      filename: buildExportFilename(options.format),
      scene,
      withTitle: Boolean(options.withTitle),
      title: (options.title ?? '').trim(),
      snippet: {
        language: detection.language,
        confidence: detection.confidence,
        code: optimized.fit.code,
        highlightedHtml: highlighted.html,
        fontSizePx: optimized.fit.fontSizePx,
        printWidth: optimized.fit.printWidth,
        widthPx: optimized.fit.widthPx,
        heightPx: optimized.fit.heightPx,
      },
    };
  }

  async encodeGif(
    frames: GifFrameInput[],
    options: GifEncodeOptions = {},
  ): Promise<GifEncodeResult> {
    return this.gifEncoder.encode(frames, options);
  }
}

/*
 * ============================================================================
 * Backward-Compatible Function Exports
 * ============================================================================
 */

let kernelSingleton: CodeSnippetKernel | null = null;

function getKernelInstance(): CodeSnippetKernel {
  if (!kernelSingleton) {
    kernelSingleton = new CodeSnippetKernel();
  }
  return kernelSingleton;
}

export function normalizeLanguage(value: string): SnippetLanguage {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'auto') return 'auto';
  return normalizeResolvedLanguageAlias(normalized) ?? 'auto';
}

export function detectLanguageDetailed(code: string): DetectionResult {
  return getKernelInstance().detectLanguage(code);
}

export function detectLanguage(code: string): ResolvedSnippetLanguage {
  return getKernelInstance().detectLanguage(code).language;
}

export function resolveLanguage(code: string, selected: string): ResolvedSnippetLanguage {
  return getKernelInstance().resolveLanguage(code, selected);
}

export function highlightSnippet(code: string, selected: string): HighlightResult {
  return getKernelInstance().highlightSnippet(code, selected);
}

export async function beautifySnippet(code: string, selected: string): Promise<BeautifyResult> {
  return getKernelInstance().beautifySnippet(code, selected);
}

export async function beautifyAndFitSnippet(
  code: string,
  options: FitSnippetOptions,
): Promise<FitSnippetResult> {
  return getKernelInstance().beautifyAndFit(code, options);
}

export function estimateSnippetWidth(code: string, options: WidthEstimateOptions = {}): number {
  const lines = code.split(/\r?\n/);
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);

  const minWidth = options.minWidth ?? DEFAULT_MIN_WIDTH;
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const charWidth = DEFAULT_CHAR_WIDTH;
  const sidePadding = DEFAULT_SIDE_PADDING;

  const naturalWidth = Math.round(Math.max(20, Math.min(longest, 180)) * charWidth + sidePadding);
  return Math.max(minWidth, Math.min(maxWidth, naturalWidth));
}

export function countLines(code: string): number {
  if (!code.length) return 1;

  const normalized = code.replace(/(?:\r?\n)+$/, '');
  if (!normalized.length) return 1;

  return normalized.split(/\r?\n/).length;
}

export function getExportPreset(id: ExportPresetId): ExportPreset {
  return EXPORT_PRESETS[id] ?? EXPORT_PRESETS['x-landscape'];
}

export function listExportPresets(): ExportPreset[] {
  return Object.values(EXPORT_PRESETS);
}

export async function encodeGifAnimation(
  frames: GifFrameInput[],
  options: GifEncodeOptions = {},
): Promise<GifEncodeResult> {
  return getKernelInstance().encodeGif(frames, options);
}

export async function prepareStaticExportPlan(
  code: string,
  options: PrepareStaticExportOptions,
): Promise<StaticExportPlan> {
  return getKernelInstance().prepareStaticExport(code, options);
}

export function run(input: string): HighlightResult {
  return highlightSnippet(input, 'auto');
}

/*
 * ============================================================================
 * Core Engines
 * ============================================================================
 */

class LanguageDetectionEngine {
  detect(code: string): DetectionResult {
    const input = code.trim();
    if (!input) {
      return {
        language: 'plaintext',
        confidence: 1,
        reason: 'auto',
        candidates: [{ language: 'plaintext', score: 1 }],
      };
    }

    const explicit = this.detectByStrongSignal(input);
    if (explicit) {
      return {
        language: explicit.language,
        confidence: explicit.confidence,
        reason: 'auto',
        candidates: [
          { language: explicit.language, score: explicit.confidence },
          { language: 'plaintext', score: 0.05 },
        ],
      };
    }

    const { winner, winnerScore, secondLanguage, secondScore } = detectLanguageWithHighlight(input);

    if (!winner || winnerScore <= 0) {
      return {
        language: 'plaintext',
        confidence: 0.2,
        reason: 'auto',
        candidates: [{ language: 'plaintext', score: 0.2 }],
      };
    }

    const candidates: DetectionCandidate[] = [{ language: winner, score: winnerScore }];
    if (secondLanguage && secondLanguage !== winner && secondScore > 0) {
      candidates.push({ language: secondLanguage, score: secondScore });
    }
    if (winner !== 'plaintext') {
      candidates.push({ language: 'plaintext', score: 0.05 });
    }

    const confidence =
      secondScore > 0
        ? clamp((winnerScore - secondScore) / Math.max(1, winnerScore), 0.2, 0.98)
        : clamp(0.55 + winnerScore * 0.08, 0.35, 0.95);

    return {
      language: winner,
      confidence,
      reason: 'auto',
      candidates: candidates.slice(0, 4),
    };
  }

  resolve(code: string, selected: string): DetectionResult {
    const normalized = normalizeLanguage(selected);
    if (normalized !== 'auto') {
      return {
        language: normalized,
        confidence: 1,
        reason: 'manual',
        candidates: [{ language: normalized, score: 1 }],
      };
    }

    return this.detect(code);
  }

  private detectByStrongSignal(
    input: string,
  ): { language: ResolvedSnippetLanguage; confidence: number } | null {
    if (
      (input.startsWith('{') && input.endsWith('}')) ||
      (input.startsWith('[') && input.endsWith(']'))
    ) {
      try {
        JSON.parse(input);
        return { language: 'json', confidence: 0.99 };
      } catch {
        // Continue with pattern-based scoring.
      }
    }

    if (input.startsWith('#!')) {
      if (/python/.test(input.slice(0, 120))) {
        return { language: 'python', confidence: 0.97 };
      }
      if (/(bash|sh|zsh)/.test(input.slice(0, 120))) {
        return { language: 'bash', confidence: 0.97 };
      }
    }

    return null;
  }
}

class BeautifyEngine {
  async beautify(
    code: string,
    language: ResolvedSnippetLanguage,
    options: BeautifyOptions = {},
  ): Promise<BeautifyResult> {
    if (!code.trim()) {
      return { success: true, language, code: '', changed: false, error: null };
    }

    try {
      if (language === 'json') {
        const parsed = JSON.parse(code);
        const output = `${JSON.stringify(parsed, null, options.tabWidth ?? 2)}\n`;
        return {
          success: true,
          language,
          code: output,
          changed: output !== code,
          error: null,
        };
      }

      const parser = getPrettierParser(language);
      if (!parser) {
        return {
          success: true,
          language,
          code,
          changed: false,
          error: null,
        };
      }

      const { format, plugins } = await loadPrettier();
      const formatted = await format(code, {
        parser,
        plugins,
        tabWidth: options.tabWidth ?? 2,
        printWidth: options.printWidth ?? 100,
        singleQuote: options.singleQuote ?? true,
        trailingComma: 'all',
        bracketSpacing: true,
        semi: options.semi ?? true,
      });

      return {
        success: true,
        language,
        code: formatted,
        changed: formatted !== code,
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to beautify this snippet.';
      return {
        success: false,
        language,
        code,
        changed: false,
        error: message,
      };
    }
  }
}

class SnippetFitEngine {
  constructor(
    private readonly beautifier: BeautifyEngine,
    private readonly detection: LanguageDetectionEngine,
  ) {}

  async fit(code: string, options: FitSnippetOptions): Promise<FitSnippetResult> {
    const detection = this.detection.detect(code);
    const selected = options.selectedLanguage ?? 'auto';
    const normalizedSelected = normalizeLanguage(selected);
    const language: ResolvedSnippetLanguage =
      normalizedSelected === 'auto' ? detection.language : normalizedSelected;

    const minPrintWidth = options.minPrintWidth ?? 36;
    const maxPrintWidth = options.maxPrintWidth ?? 120;
    const maxIterations = options.maxIterations ?? 7;
    const minFontSize = options.minFontSizePx ?? 11;
    const maxFontSize = options.maxFontSizePx ?? 14;

    let printWidth = clamp(
      Math.floor((options.targetWidthPx - 40) / 8.3),
      minPrintWidth,
      maxPrintWidth,
    );
    let fontSize = maxFontSize;
    let currentCode = code;
    let lastMeasurement = measureSnippet(currentCode, fontSize);
    let overflowX = lastMeasurement.widthPx > options.targetWidthPx;
    let overflowY = lastMeasurement.heightPx > options.targetHeightPx;

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      const beautified = await this.beautifier.beautify(currentCode, language, {
        printWidth,
      });

      currentCode = beautified.success ? beautified.code : currentCode;

      // For non-formatter languages, apply a conservative wrap strategy to avoid horizontal overflow.
      if (!getPrettierParser(language) && printWidth > 0) {
        currentCode = softWrapCode(currentCode, printWidth);
      }

      lastMeasurement = measureSnippet(currentCode, fontSize);
      overflowX = lastMeasurement.widthPx > options.targetWidthPx;
      overflowY = lastMeasurement.heightPx > options.targetHeightPx;

      if (!overflowX && !overflowY) {
        return {
          success: true,
          language,
          code: currentCode,
          printWidth,
          fontSizePx: fontSize,
          widthPx: lastMeasurement.widthPx,
          heightPx: lastMeasurement.heightPx,
          overflowX,
          overflowY,
          iterations: iteration,
          error: null,
        };
      }

      if (overflowX && printWidth > minPrintWidth) {
        printWidth = Math.max(minPrintWidth, printWidth - 8);
      }

      if (overflowY && fontSize > minFontSize) {
        fontSize = Math.max(minFontSize, Number((fontSize - 0.5).toFixed(2)));
      }
    }

    return {
      success: !overflowX && !overflowY,
      language,
      code: currentCode,
      printWidth,
      fontSizePx: fontSize,
      widthPx: lastMeasurement.widthPx,
      heightPx: lastMeasurement.heightPx,
      overflowX,
      overflowY,
      iterations: maxIterations,
      error:
        overflowX || overflowY ? 'Unable to fit snippet in the target box without overflow.' : null,
    };
  }

  async optimizeForExport(
    code: string,
    options: ExportLayoutOptimizationOptions,
  ): Promise<ExportLayoutOptimizationResult> {
    const minCardWidthPx = Math.max(240, Math.round(options.minCardWidthPx));
    const maxCardWidthPx = Math.max(minCardWidthPx, Math.round(options.maxCardWidthPx));
    const minCardHeightPx = Math.max(180, Math.round(options.minCardHeightPx));
    const maxCardHeightPx = Math.max(minCardHeightPx, Math.round(options.maxCardHeightPx));

    const candidateCardWidths = this.buildCardWidthCandidates(code, minCardWidthPx, maxCardWidthPx);
    const sourceLines = Math.max(1, countLines(code));

    let best: ExportLayoutOptimizationResult | null = null;

    for (const cardWidthPx of candidateCardWidths) {
      const targetWidthPx = Math.max(220, cardWidthPx - options.contentPaddingX);
      const targetHeightPx = Math.max(160, maxCardHeightPx - options.contentPaddingY);

      const fit = await this.fit(code, {
        selectedLanguage: options.selectedLanguage,
        targetWidthPx,
        targetHeightPx,
        maxIterations: 9,
        minPrintWidth: options.minPrintWidth,
        maxPrintWidth: options.maxPrintWidth,
        minFontSizePx: options.minFontSizePx,
        maxFontSizePx: options.maxFontSizePx,
      });

      const contentHeightPx = Math.max(120, Math.ceil(fit.heightPx + options.contentPaddingY));
      const cardHeightPx = clamp(contentHeightPx, minCardHeightPx, maxCardHeightPx);
      const utilizationX = clamp(fit.widthPx / Math.max(1, targetWidthPx), 0, 1.2);
      const wrapGrowth = Math.max(1, countLines(fit.code) / sourceLines);

      const candidate: ExportLayoutOptimizationResult = {
        fit,
        cardWidthPx,
        cardHeightPx,
        utilizationX,
        wrapGrowth,
        score: this.scoreLayout(
          fit,
          cardWidthPx,
          maxCardWidthPx,
          utilizationX,
          wrapGrowth,
          options,
        ),
      };

      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }

    if (best) {
      return best;
    }

    const fallbackFit = await this.fit(code, {
      selectedLanguage: options.selectedLanguage,
      targetWidthPx: Math.max(220, maxCardWidthPx - options.contentPaddingX),
      targetHeightPx: Math.max(160, maxCardHeightPx - options.contentPaddingY),
      minPrintWidth: options.minPrintWidth,
      maxPrintWidth: options.maxPrintWidth,
      minFontSizePx: options.minFontSizePx,
      maxFontSizePx: options.maxFontSizePx,
    });

    return {
      fit: fallbackFit,
      cardWidthPx: maxCardWidthPx,
      cardHeightPx: clamp(
        Math.ceil(fallbackFit.heightPx + options.contentPaddingY),
        minCardHeightPx,
        maxCardHeightPx,
      ),
      utilizationX: clamp(
        fallbackFit.widthPx / Math.max(1, maxCardWidthPx - options.contentPaddingX),
        0,
        1,
      ),
      wrapGrowth: Math.max(1, countLines(fallbackFit.code) / sourceLines),
      score: 0,
    };
  }

  private buildCardWidthCandidates(code: string, minWidthPx: number, maxWidthPx: number): number[] {
    const values = new Set<number>();
    const span = Math.max(1, maxWidthPx - minWidthPx);
    const steps = 8;

    values.add(minWidthPx);
    values.add(maxWidthPx);
    values.add(
      estimateSnippetWidth(code, {
        minWidth: minWidthPx,
        maxWidth: maxWidthPx,
      }),
    );

    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      values.add(Math.round(maxWidthPx - span * t));
    }

    return [...values].sort((a, b) => b - a);
  }

  private scoreLayout(
    fit: FitSnippetResult,
    cardWidthPx: number,
    maxCardWidthPx: number,
    utilizationX: number,
    wrapGrowth: number,
    options: ExportLayoutOptimizationOptions,
  ): number {
    const minFont = options.minFontSizePx ?? 11;
    const maxFont = options.maxFontSizePx ?? 14;
    const fontNormalized = clamp(
      (fit.fontSizePx - minFont) / Math.max(0.01, maxFont - minFont),
      0,
      1,
    );
    const widthNormalized = clamp(cardWidthPx / Math.max(1, maxCardWidthPx), 0, 1);

    const utilizationPenalty = Math.max(0, options.minCodeUtilization - utilizationX) * 2.4;
    const wrapPenalty = Math.max(0, wrapGrowth - options.maxWrapGrowth) * 2.1;
    const overflowPenalty = fit.overflowX || fit.overflowY ? 4.5 : 0;

    return (
      fontNormalized * 2.2 +
      utilizationX * 1.6 +
      widthNormalized * 0.35 -
      utilizationPenalty -
      wrapPenalty -
      overflowPenalty
    );
  }
}

class ExportSceneEngine {
  buildScene(code: string, options: BuildExportSceneOptions): ExportSceneModel {
    const preset = resolvePreset(options);
    const minCardWidth = Math.floor(preset.width * preset.minCardWidthRatio);
    const maxCardWidth = Math.floor(preset.width * preset.maxCardWidthRatio);

    const estimatedCardWidth = clamp(
      estimateSnippetWidth(code, {
        minWidth: minCardWidth,
        maxWidth: maxCardWidth,
      }),
      minCardWidth,
      maxCardWidth,
    );

    const lines = countLines(code);
    const estimatedCardHeight = clamp(
      Math.round(lines * 20 + 68),
      220,
      Math.floor(preset.height * preset.maxCardHeightRatio),
    );

    return {
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
      outerPadding: preset.outerPadding,
      cardWidth: estimatedCardWidth,
      cardHeight: estimatedCardHeight,
      theme: options.theme ?? 'dark',
      backgroundClass: 'app-universe-bg',
    };
  }
}

class GifAnimationEncoder {
  async encode(frames: GifFrameInput[], options: GifEncodeOptions = {}): Promise<GifEncodeResult> {
    const encoded = await encodeGifWithRuntimeWorker(frames, options);
    const blobBytes = Uint8Array.from(encoded.bytes);
    return {
      bytes: encoded.bytes,
      blob: new Blob([blobBytes], { type: 'image/gif' }),
      frameCount: encoded.frameCount,
      width: encoded.width,
      height: encoded.height,
      durationMs: encoded.durationMs,
    };
  }
}

/*
 * ============================================================================
 * Presets & Policies
 * ============================================================================
 */

const DEFAULT_MIN_WIDTH = 340;
const DEFAULT_MAX_WIDTH = 1100;
const DEFAULT_CHAR_WIDTH = 8.3;
const DEFAULT_SIDE_PADDING = 64;
const DEFAULT_LINE_HEIGHT = 1.6;
const DEFAULT_EDITOR_PADDING_X = 36;
const DEFAULT_EDITOR_PADDING_Y = 28;

const EXPORT_PRESETS: Record<ExportPresetId, ExportPreset> = {
  'instagram-square': {
    id: 'instagram-square',
    width: 1080,
    height: 1080,
    outerPadding: 82,
    minCardWidthRatio: 0.7,
    maxCardWidthRatio: 0.84,
    minCardHeightRatio: 0.42,
    maxCardHeightRatio: 0.76,
    minCodeUtilization: 0.64,
    maxWrapGrowth: 1.85,
    minFontSizePx: 12,
    maxFontSizePx: 18,
  },
  'instagram-portrait': {
    id: 'instagram-portrait',
    width: 1080,
    height: 1350,
    outerPadding: 92,
    minCardWidthRatio: 0.7,
    maxCardWidthRatio: 0.84,
    minCardHeightRatio: 0.34,
    maxCardHeightRatio: 0.78,
    minCodeUtilization: 0.64,
    maxWrapGrowth: 1.9,
    minFontSizePx: 12,
    maxFontSizePx: 18,
  },
  'instagram-story': {
    id: 'instagram-story',
    width: 1080,
    height: 1920,
    outerPadding: 84,
    minCardWidthRatio: 0.8,
    maxCardWidthRatio: 0.86,
    minCardHeightRatio: 0.44,
    maxCardHeightRatio: 0.72,
    minCodeUtilization: 0.58,
    maxWrapGrowth: 1.75,
    minFontSizePx: 13,
    maxFontSizePx: 20,
  },
  'linkedin-feed': {
    id: 'linkedin-feed',
    width: 1200,
    height: 627,
    outerPadding: 40,
    minCardWidthRatio: 0.82,
    maxCardWidthRatio: 0.84,
    minCardHeightRatio: 0.5,
    maxCardHeightRatio: 0.88,
    minCodeUtilization: 0.7,
    maxWrapGrowth: 1.6,
    minFontSizePx: 11,
    maxFontSizePx: 16,
  },
  'x-landscape': {
    id: 'x-landscape',
    width: 1600,
    height: 900,
    outerPadding: 72,
    minCardWidthRatio: 0.56,
    maxCardWidthRatio: 0.8,
    minCardHeightRatio: 0.3,
    maxCardHeightRatio: 0.8,
    minCodeUtilization: 0.55,
    maxWrapGrowth: 2.1,
    minFontSizePx: 11,
    maxFontSizePx: 14,
  },
  custom: {
    id: 'custom',
    width: 1200,
    height: 1200,
    outerPadding: 72,
    minCardWidthRatio: 0.56,
    maxCardWidthRatio: 0.84,
    minCardHeightRatio: 0.24,
    maxCardHeightRatio: 0.8,
    minCodeUtilization: 0.55,
    maxWrapGrowth: 2.2,
    minFontSizePx: 11,
    maxFontSizePx: 16,
  },
};

/*
 * ============================================================================
 * Prettier Bundle Loader
 * ============================================================================
 */

type PrettierBundle = {
  format: (source: string, options: Record<string, unknown>) => Promise<string>;
  plugins: unknown[];
};

let prettierPromise: Promise<PrettierBundle> | null = null;

async function loadPrettier(): Promise<PrettierBundle> {
  if (!prettierPromise) {
    prettierPromise = Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/typescript'),
      import('prettier/plugins/postcss'),
      import('prettier/plugins/html'),
      import('prettier/plugins/markdown'),
    ]).then(([prettier, babel, estree, typescript, postcss, html, markdown]) => ({
      format: prettier.format,
      plugins: [
        babel.default ?? babel,
        estree.default ?? estree,
        typescript.default ?? typescript,
        postcss.default ?? postcss,
        html.default ?? html,
        markdown.default ?? markdown,
      ],
    }));
  }

  return prettierPromise;
}

/*
 * ============================================================================
 * Utilities
 * ============================================================================
 */

function resolvePreset(options: BuildExportSceneOptions): ExportPreset {
  const requested = options.presetId ?? 'x-landscape';
  if (requested !== 'custom') {
    return EXPORT_PRESETS[requested] ?? EXPORT_PRESETS['x-landscape'];
  }

  const width = clamp(Math.round(options.customWidth ?? 1200), 320, 20000);
  const height = clamp(Math.round(options.customHeight ?? 1200), 320, 20000);

  return {
    ...EXPORT_PRESETS.custom,
    width,
    height,
  };
}

function measureSnippet(code: string, fontSizePx: number): { widthPx: number; heightPx: number } {
  const lines = code.split(/\r?\n/);
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);

  const charWidth = (fontSizePx / 13) * DEFAULT_CHAR_WIDTH;
  const lineHeightPx = fontSizePx * DEFAULT_LINE_HEIGHT;

  return {
    widthPx: Math.ceil(longest * charWidth + DEFAULT_EDITOR_PADDING_X),
    heightPx: Math.ceil(Math.max(1, lines.length) * lineHeightPx + DEFAULT_EDITOR_PADDING_Y),
  };
}

function softWrapCode(code: string, maxColumns: number): string {
  if (maxColumns <= 16 || !code.trim()) {
    return code;
  }

  const lines = code.split(/\r?\n/);
  const wrapped: string[] = [];

  for (const line of lines) {
    if (line.length <= maxColumns) {
      wrapped.push(line);
      continue;
    }

    const indent = line.match(/^\s*/)?.[0] ?? '';
    const stringContinuationIndent = detectStringContinuationIndent(
      line,
      indent.length,
      maxColumns,
    );
    const continuationIndent = stringContinuationIndent ?? indent;
    let remaining = line;

    while (remaining.length > maxColumns) {
      const splitAt = remaining.lastIndexOf(' ', maxColumns);
      const index = splitAt > indent.length + 4 ? splitAt : maxColumns;
      wrapped.push(remaining.slice(0, index));
      remaining = `${continuationIndent}${remaining.slice(index).trimStart()}`;
    }

    wrapped.push(remaining);
  }

  return wrapped.join('\n');
}

function detectStringContinuationIndent(
  line: string,
  baseIndentLength: number,
  maxColumns: number,
): string | null {
  const scanLimit = Math.min(line.length, maxColumns);

  for (let index = baseIndentLength; index < scanLimit; index += 1) {
    const char = line[index];
    if (char !== '"' && char !== "'" && char !== '`') {
      continue;
    }

    if (index > 0 && line[index - 1] === '\\') {
      continue;
    }

    const nextTextMatch = /\S/.exec(line.slice(index + 1));
    const continuationColumn = nextTextMatch ? index + 1 + nextTextMatch.index : index + 1;
    return ' '.repeat(Math.max(baseIndentLength, continuationColumn));
  }

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatToMimeType(
  format: Exclude<ExportFormat, 'gif'>,
): 'image/png' | 'image/jpeg' | 'image/svg+xml' {
  if (format === 'png') return 'image/png';
  if (format === 'jpg') return 'image/jpeg';
  return 'image/svg+xml';
}

function buildExportFilename(format: Exclude<ExportFormat, 'gif'>): string {
  return `snippet.${format}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
