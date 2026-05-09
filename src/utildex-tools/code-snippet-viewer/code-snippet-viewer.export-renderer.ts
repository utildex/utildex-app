import type { CodeSnippetKernel, StaticExportPlan } from './code-snippet-viewer.kernel';
import {
  applySharedStaticBackground,
  createSharedAnimatedBackground,
} from '../../core/export/shared-export-backgrounds';
import {
  SharedExportRenderer,
  type SharedStaticExportFormat,
} from '../../core/export/shared-export-renderer';

type ExportFormat = 'png' | 'jpg' | 'svg' | 'gif';
type StaticExportFormat = Exclude<ExportFormat, 'gif'>;

interface ExportNodeThemePreset {
  cardBorder: string;
  cardBackground: string;
  titleColor: string;
  snippetColor: string;
  snippetBackground: string;
}

export interface ExportRenderQuality {
  pixelRatio: number;
  jpegQuality: number;
  gifMaxColors: number;
  gifDurationMs: number;
}

export interface ExportRenderRequest {
  plan: StaticExportPlan;
  format: ExportFormat;
  quality: ExportRenderQuality;
  gifFps: number;
  titleFallback: string;
}

export interface ExportRenderResult {
  outputUrl: string;
  filename: string;
}

const GIF_TRAVEL_PROGRESS_SCALE = 0.34;
const TOKEN_SELECTOR_GROUPS: ReadonlyArray<string> = [
  '.token.comment, .token.block-comment, .token.prolog, .token.doctype, .token.cdata',
  '.token.punctuation',
  '.token.tag, .token.attr-name, .token.namespace, .token.deleted',
  '.token.function-name, .token.function',
  '.token.boolean, .token.number, .token.constant, .token.symbol',
  '.token.property, .token.class-name',
  '.token.selector, .token.important, .token.atrule, .token.keyword, .token.builtin',
  '.token.string, .token.char, .token.attr-value, .token.regex, .token.variable',
  '.token.operator, .token.entity, .token.url',
];

const DARK_TOKEN_COLORS = [
  '#94a3b8',
  '#cbd5e1',
  '#fda4af',
  '#93c5fd',
  '#fdba74',
  '#fcd34d',
  '#c4b5fd',
  '#86efac',
  '#67e8f9',
] as const;

const LIGHT_TOKEN_COLORS = [
  '#64748b',
  '#334155',
  '#be123c',
  '#1d4ed8',
  '#b45309',
  '#a16207',
  '#7c3aed',
  '#15803d',
  '#0f766e',
] as const;

export class SnippetExportRenderer {
  private readonly exportRenderer = new SharedExportRenderer();

  constructor(private readonly kernel: Pick<CodeSnippetKernel, 'encodeGif'>) {}

  async render(request: ExportRenderRequest): Promise<ExportRenderResult> {
    const { plan, format, quality, gifFps, titleFallback } = request;
    const node = this.buildExportNode(plan, format !== 'gif', format === 'gif', titleFallback);
    document.body.appendChild(node);

    try {
      if (format === 'gif') {
        const outputUrl = await this.renderAnimatedGif(node, plan, gifFps, quality);
        return {
          outputUrl,
          filename: plan.filename.replace(/\.png$/, '.gif'),
        };
      }

      const outputUrl = await this.renderStaticFormat(node, format, quality);
      return {
        outputUrl,
        filename: plan.filename,
      };
    } finally {
      node.remove();
    }
  }

  private async renderStaticFormat(
    node: HTMLElement,
    format: StaticExportFormat,
    quality: ExportRenderQuality,
  ): Promise<string> {
    return this.exportRenderer.renderStatic(
      node,
      format as SharedStaticExportFormat,
      {
        pixelRatio: quality.pixelRatio,
        jpegQuality: quality.jpegQuality,
      },
      {
        backgroundColor: '#020617',
      },
    );
  }

  private buildExportNode(
    plan: StaticExportPlan,
    includeBackground: boolean,
    forceOpaqueSurface: boolean,
    titleFallback: string,
  ): HTMLDivElement {
    const themePreset = this.resolveExportThemePreset(plan.scene.theme, forceOpaqueSurface);

    const root = document.createElement('div');
    this.applyInlineStyles(root, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: `${plan.scene.width}px`,
      height: `${plan.scene.height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${plan.scene.outerPadding}px`,
      boxSizing: 'border-box',
      overflow: 'hidden',
      pointerEvents: 'none',
      opacity: '0',
      zIndex: '-1',
    });

    if (includeBackground) {
      applySharedStaticBackground(root, plan.scene.width, plan.scene.height, {
        id: 'app-starfield-dark',
      });
    } else {
      root.style.background = 'transparent';
    }

    const exportStyles = document.createElement('style');
    exportStyles.textContent = this.buildTokenStyleSheet();
    root.appendChild(exportStyles);

    const card = document.createElement('div');
    card.className = 'snippet-surface';
    if (plan.scene.theme === 'light') {
      card.classList.add('theme-light');
    }
    this.applyInlineStyles(card, {
      width: `${Math.min(plan.scene.cardWidth, plan.scene.width - plan.scene.outerPadding * 2)}px`,
      maxWidth: '100%',
      minHeight: `${plan.scene.cardHeight}px`,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '14px',
      border: themePreset.cardBorder,
      background: themePreset.cardBackground,
    });

    if (plan.withTitle) {
      const titlebar = document.createElement('div');
      titlebar.className = 'snippet-titlebar';
      titlebar.textContent = plan.title || titleFallback;
      this.applyInlineStyles(titlebar, {
        borderBottom: '1px solid rgba(148, 163, 184, 0.26)',
        padding: '10px 12px',
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        fontSize: '12px',
        fontWeight: '600',
        lineHeight: '1.35',
        color: themePreset.titleColor,
      });
      card.appendChild(titlebar);
    }

    const pre = document.createElement('pre');
    pre.className = `snippet-pre language-${plan.snippet.language}${plan.withTitle ? ' with-title' : ''}`;
    this.applyInlineStyles(pre, {
      overflow: 'hidden',
      height: 'auto',
      maxHeight: 'none',
      fontSize: `${plan.snippet.fontSizePx}px`,
      minHeight: 'auto',
      margin: '0',
      padding: '16px 18px',
      fontFamily: "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      color: themePreset.snippetColor,
      background: themePreset.snippetBackground,
    });

    const code = document.createElement('code');
    code.className = `snippet-code language-${plan.snippet.language}`;
    this.applyInlineStyles(code, {
      display: 'block',
      whiteSpace: 'inherit',
      color: 'inherit',
      font: 'inherit',
      lineHeight: 'inherit',
    });
    code.innerHTML = plan.snippet.highlightedHtml || '&nbsp;';
    pre.appendChild(code);
    card.appendChild(pre);

    root.appendChild(card);
    return root;
  }

  private buildTokenStyleSheet(): string {
    const base = [
      ".snippet-pre { margin: 0; padding: 16px 18px; font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.6; white-space: pre; color: #e2e8f0; background: transparent; overflow: hidden; }",
      '.snippet-code { display: block; color: inherit; }',
      '.snippet-surface.theme-light .snippet-pre, .snippet-surface.theme-light .snippet-code { color: #0f172a; }',
    ];

    const darkRules = TOKEN_SELECTOR_GROUPS.map((selectors, index) => {
      return `.snippet-code ${selectors} { color: ${DARK_TOKEN_COLORS[index]}; }`;
    });
    const lightRules = TOKEN_SELECTOR_GROUPS.map((selectors, index) => {
      return `.snippet-surface.theme-light .snippet-code ${selectors} { color: ${LIGHT_TOKEN_COLORS[index]}; }`;
    });

    return [...base, ...darkRules, ...lightRules].join('\n');
  }

  private async renderAnimatedGif(
    node: HTMLElement,
    plan: StaticExportPlan,
    fpsInput: number,
    quality: ExportRenderQuality,
  ): Promise<string> {
    const animatedBackground = createSharedAnimatedBackground(plan.scene.width, plan.scene.height, {
      id: 'app-starfield-dark',
    });
    return this.exportRenderer.renderGif({
      sourceNode: node,
      width: plan.scene.width,
      height: plan.scene.height,
      profile: 'reliable',
      fps: fpsInput,
      durationMs: quality.gifDurationMs,
      maxColors: quality.gifMaxColors,
      drawFrame: (ctx, frameProgress, sourceImage) => {
        const progress = frameProgress * GIF_TRAVEL_PROGRESS_SCALE;
        ctx.drawImage(animatedBackground.baseCanvas, 0, 0, plan.scene.width, plan.scene.height);
        animatedBackground.drawOverlayFrame(ctx, progress);
        ctx.drawImage(sourceImage, 0, 0, plan.scene.width, plan.scene.height);
      },
      encodeGif: (frames, options) => this.kernel.encodeGif(frames, options),
    });
  }

  private resolveExportThemePreset(
    theme: StaticExportPlan['scene']['theme'],
    forceOpaqueSurface: boolean,
  ): ExportNodeThemePreset {
    if (theme === 'light') {
      return {
        cardBorder: '1px solid rgba(226, 232, 240, 0.9)',
        cardBackground: forceOpaqueSurface
          ? '#ffffff'
          : 'linear-gradient(170deg, rgba(255, 255, 255, 0.97), rgba(248, 250, 252, 0.95))',
        titleColor: '#334155',
        snippetColor: '#0f172a',
        snippetBackground: forceOpaqueSurface ? '#ffffff' : 'transparent',
      };
    }

    return {
      cardBorder: '1px solid rgba(255, 255, 255, 0.08)',
      cardBackground: forceOpaqueSurface ? '#0f172a' : 'rgba(15, 23, 42, 0.78)',
      titleColor: '#cbd5e1',
      snippetColor: '#e2e8f0',
      snippetBackground: forceOpaqueSurface ? '#0f172a' : 'transparent',
    };
  }

  private applyInlineStyles(element: HTMLElement, styles: Record<string, string>) {
    for (const [property, value] of Object.entries(styles)) {
      if (!value) {
        continue;
      }

      element.style.setProperty(this.toCssPropertyName(property), value);
    }
  }

  private toCssPropertyName(property: string): string {
    return property.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
  }
}
