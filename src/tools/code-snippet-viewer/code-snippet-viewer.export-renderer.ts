import { getFontEmbedCSS, toJpeg, toPng, toSvg } from 'html-to-image';
import type { CodeSnippetKernel, StaticExportPlan } from './code-snippet-viewer.kernel';

type ExportFormat = 'png' | 'jpg' | 'svg' | 'gif';
type StaticExportFormat = Exclude<ExportFormat, 'gif'>;

interface GeneratedStar {
  x: number;
  y: number;
  alpha: number;
}

interface GeneratedStarLayer {
  size: number;
  speed: number;
  color: string;
  stars: GeneratedStar[];
}

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
  private fontEmbedCss: string | null = null;

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
    const fontEmbedCSS = await this.getFontEmbedCss(node);
    const options = {
      cacheBust: true,
      fontEmbedCSS,
      backgroundColor: '#020617',
      style: {
        opacity: '1',
      },
    };

    if (format === 'jpg') {
      return toJpeg(node, {
        ...options,
        quality: quality.jpegQuality,
        pixelRatio: quality.pixelRatio,
      });
    }

    if (format === 'svg') {
      return toSvg(node, options);
    }

    return toPng(node, {
      ...options,
      pixelRatio: quality.pixelRatio,
    });
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
      root.style.backgroundColor = '#020617';
      root.style.background =
        'radial-gradient(circle at 20% 18%, rgba(59, 130, 246, 0.18), transparent 36%), radial-gradient(circle at 84% 20%, rgba(16, 185, 129, 0.16), transparent 34%), linear-gradient(180deg, rgba(15, 23, 42, 0.62), rgba(2, 6, 23, 0.95))';
      this.appendStaticExportStars(root, plan.scene.width, plan.scene.height);
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
    const fontEmbedCSS = await this.getFontEmbedCss(node);
    const cardDataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: 'transparent',
      fontEmbedCSS,
      style: {
        opacity: '1',
      },
    });
    const cardImage = await this.loadImage(cardDataUrl);

    const canvas = document.createElement('canvas');
    canvas.width = plan.scene.width;
    canvas.height = plan.scene.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Unable to initialize GIF renderer.');
    }

    const staticBackground = this.buildPrecompiledGifBackground(
      plan.scene.width,
      plan.scene.height,
    );
    const layers = this.generateStarLayers(plan.scene.width, plan.scene.height);
    const fps = Math.max(1, Math.round(fpsInput));
    const frameDelayMs = Math.max(20, Math.round(1000 / fps));
    const frameCount = Math.max(8, Math.round((quality.gifDurationMs / 1000) * fps));
    const frames: Array<{
      rgba: Uint8ClampedArray;
      width: number;
      height: number;
      delayMs: number;
    }> = [];

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const progress = (frameIndex / frameCount) * GIF_TRAVEL_PROGRESS_SCALE;
      ctx.clearRect(0, 0, plan.scene.width, plan.scene.height);
      ctx.drawImage(staticBackground, 0, 0, plan.scene.width, plan.scene.height);
      this.drawAnimatedStars(ctx, plan.scene.width, plan.scene.height, layers, progress);
      ctx.drawImage(cardImage, 0, 0, plan.scene.width, plan.scene.height);

      const frameData = ctx.getImageData(0, 0, plan.scene.width, plan.scene.height);
      frames.push({
        rgba: frameData.data,
        width: plan.scene.width,
        height: plan.scene.height,
        delayMs: frameDelayMs,
      });
    }

    const result = await this.kernel.encodeGif(frames, {
      repeat: 0,
      maxColors: quality.gifMaxColors,
    });

    return URL.createObjectURL(result.blob);
  }

  private async loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to load rendered export frame.'));
      image.src = dataUrl;
    });
  }

  private drawAnimatedStars(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    layers: GeneratedStarLayer[],
    progress: number,
  ) {
    for (const layer of layers) {
      const travel = height + 240;
      for (const star of layer.stars) {
        let y = star.y - progress * travel * layer.speed;
        y = (((y % travel) + travel) % travel) - 120;
        const wrappedY = y + travel;

        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = layer.color;
        ctx.fillRect(star.x, y, layer.size, layer.size);
        if (wrappedY < height + layer.size) {
          ctx.fillRect(star.x, wrappedY, layer.size, layer.size);
        }
      }
    }

    ctx.globalAlpha = 1;
  }

  private buildPrecompiledGifBackground(width: number, height: number): HTMLCanvasElement {
    const backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.width = width;
    backgroundCanvas.height = height;
    const bgCtx = backgroundCanvas.getContext('2d');
    if (!bgCtx) {
      return backgroundCanvas;
    }

    bgCtx.fillStyle = '#020617';
    bgCtx.fillRect(0, 0, width, height);

    const depthGradient = bgCtx.createLinearGradient(0, 0, 0, height);
    depthGradient.addColorStop(0, 'rgba(15, 23, 42, 0.62)');
    depthGradient.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
    bgCtx.fillStyle = depthGradient;
    bgCtx.fillRect(0, 0, width, height);

    const blueWash = bgCtx.createLinearGradient(0, 0, width * 0.62, height * 0.58);
    blueWash.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
    blueWash.addColorStop(0.7, 'rgba(59, 130, 246, 0.04)');
    blueWash.addColorStop(1, 'rgba(59, 130, 246, 0)');
    bgCtx.fillStyle = blueWash;
    bgCtx.fillRect(0, 0, width, height);

    const greenWash = bgCtx.createLinearGradient(width, height * 0.08, width * 0.38, height * 0.72);
    greenWash.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    greenWash.addColorStop(0.7, 'rgba(16, 185, 129, 0.03)');
    greenWash.addColorStop(1, 'rgba(16, 185, 129, 0)');
    bgCtx.fillStyle = greenWash;
    bgCtx.fillRect(0, 0, width, height);

    return backgroundCanvas;
  }

  private generateStarLayers(width: number, height: number): GeneratedStarLayer[] {
    const area = width * height;
    const densityFactor = Math.max(0.8, Math.min(1.4, area / (1080 * 1080)));

    return [
      this.createStarLayer(
        Math.round(220 * densityFactor),
        1,
        0.44,
        '#94a3b8',
        width,
        height,
        [0.35, 0.75],
      ),
      this.createStarLayer(
        Math.round(120 * densityFactor),
        2,
        0.32,
        '#cbd5e1',
        width,
        height,
        [0.45, 0.85],
      ),
      this.createStarLayer(
        Math.round(70 * densityFactor),
        3,
        0.22,
        '#e2e8f0',
        width,
        height,
        [0.55, 0.95],
      ),
    ];
  }

  private createStarLayer(
    count: number,
    size: number,
    speed: number,
    color: string,
    width: number,
    height: number,
    alphaRange: [number, number],
  ): GeneratedStarLayer {
    const stars: GeneratedStar[] = [];
    for (let i = 0; i < count; i += 1) {
      const rawAlpha = alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0]);
      stars.push({
        x: Math.random() * width,
        y: Math.random() * (height + 240) - 120,
        alpha: Math.round(rawAlpha * 4) / 4,
      });
    }

    return {
      size,
      speed,
      color,
      stars,
    };
  }

  private appendStaticExportStars(root: HTMLDivElement, width: number, height: number) {
    const areaScale = Math.max(0.8, Math.min(1.5, (width * height) / (1280 * 720)));
    const starsSmall = this.createStarFieldShadow(Math.round(340 * areaScale), width, height, [
      '#94a3b8',
      '#cbd5e1',
      '#e2e8f0',
    ]);
    const starsMedium = this.createStarFieldShadow(Math.round(130 * areaScale), width, height, [
      '#cbd5e1',
      '#e2e8f0',
    ]);
    const starsLarge = this.createStarFieldShadow(Math.round(58 * areaScale), width, height, [
      '#e2e8f0',
    ]);

    const createLayer = (sizePx: number, shadow: string) => {
      const layer = document.createElement('div');
      this.applyInlineStyles(layer, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        overflow: 'hidden',
      });

      const star = document.createElement('div');
      this.applyInlineStyles(star, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        borderRadius: '999px',
        background: 'transparent',
        boxShadow: shadow,
      });
      layer.appendChild(star);

      return layer;
    };

    root.appendChild(createLayer(1, starsSmall));
    root.appendChild(createLayer(2, starsMedium));
    root.appendChild(createLayer(3, starsLarge));
  }

  private createStarFieldShadow(
    count: number,
    width: number,
    height: number,
    colors: string[],
  ): string {
    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const color = colors[Math.floor(Math.random() * colors.length)] ?? '#cbd5e1';
      parts.push(`${x}px ${y}px ${color}`);
    }
    return parts.join(', ');
  }

  private async getFontEmbedCss(node: HTMLElement): Promise<string | undefined> {
    if (this.fontEmbedCss !== null) {
      return this.fontEmbedCss || undefined;
    }

    try {
      this.fontEmbedCss = await getFontEmbedCSS(node);
      return this.fontEmbedCss || undefined;
    } catch {
      this.fontEmbedCss = '';
      return undefined;
    }
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
