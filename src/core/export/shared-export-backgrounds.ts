export type SharedExportFormat = 'png' | 'jpg' | 'svg' | 'gif';

export type SharedExportBackgroundId =
  | 'app-starfield-dark'
  | 'app-starfield-light'
  | 'solid-color'
  | 'transparent';

export type SharedExportBackgroundSpec =
  | { id: 'app-starfield-dark' }
  | { id: 'app-starfield-light' }
  | { id: 'transparent' }
  | { id: 'solid-color'; color: string };

export interface SharedExportBackgroundDefinition {
  id: SharedExportBackgroundId;
  label: string;
  kind: 'app-starfield' | 'solid' | 'transparent';
  supportsAnimation: boolean;
  supportedFormats: readonly SharedExportFormat[];
}

const ALL_EXPORT_FORMATS: readonly SharedExportFormat[] = ['png', 'jpg', 'svg', 'gif'];

export const SHARED_EXPORT_BACKGROUNDS: readonly SharedExportBackgroundDefinition[] = [
  {
    id: 'app-starfield-dark',
    label: 'App Starfield (Dark)',
    kind: 'app-starfield',
    supportsAnimation: true,
    supportedFormats: ALL_EXPORT_FORMATS,
  },
  {
    id: 'app-starfield-light',
    label: 'App Starfield (Light)',
    kind: 'app-starfield',
    supportsAnimation: true,
    supportedFormats: ALL_EXPORT_FORMATS,
  },
  {
    id: 'solid-color',
    label: 'Solid Color',
    kind: 'solid',
    supportsAnimation: false,
    supportedFormats: ['png', 'jpg', 'svg'],
  },
  {
    id: 'transparent',
    label: 'Transparent',
    kind: 'transparent',
    supportsAnimation: false,
    supportedFormats: ['png', 'svg'],
  },
];

const FALLBACK_SPEC: SharedExportBackgroundSpec = { id: 'app-starfield-dark' };

const DARK_STAR_COLORS_SMALL = ['#94a3b8', '#cbd5e1', '#e2e8f0'];
const DARK_STAR_COLORS_MEDIUM = ['#cbd5e1', '#e2e8f0'];
const DARK_STAR_COLORS_LARGE = ['#e2e8f0'];

const LIGHT_STAR_COLORS_SMALL = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706'];
const LIGHT_STAR_COLORS_MEDIUM = ['#1d4ed8', '#6d28d9', '#be185d', '#047857', '#b45309'];
const LIGHT_STAR_COLORS_LARGE = ['#1e40af', '#5b21b6', '#9d174d', '#065f46', '#92400e'];

interface GeneratedStar {
  x: number;
  y: number;
  alpha: number;
  color: string;
}

interface GeneratedStarLayer {
  size: number;
  speed: number;
  stars: GeneratedStar[];
}

export interface SharedAnimatedBackground {
  baseCanvas: HTMLCanvasElement;
  drawOverlayFrame(ctx: CanvasRenderingContext2D, progress: number): void;
}

export function listSharedExportBackgrounds(
  format?: SharedExportFormat,
): readonly SharedExportBackgroundDefinition[] {
  if (!format) {
    return SHARED_EXPORT_BACKGROUNDS;
  }

  return SHARED_EXPORT_BACKGROUNDS.filter((definition) =>
    definition.supportedFormats.includes(format),
  );
}

export function isSharedExportBackgroundSupported(
  spec: SharedExportBackgroundSpec,
  format: SharedExportFormat,
): boolean {
  const definition = SHARED_EXPORT_BACKGROUNDS.find((entry) => entry.id === spec.id);
  return Boolean(definition?.supportedFormats.includes(format));
}

export function applySharedStaticBackground(
  root: HTMLElement,
  width: number,
  height: number,
  spec: SharedExportBackgroundSpec = FALLBACK_SPEC,
): void {
  switch (spec.id) {
    case 'app-starfield-dark':
      applyAppStarfieldStaticBackground(root, width, height, 'dark');
      return;
    case 'app-starfield-light':
      applyAppStarfieldStaticBackground(root, width, height, 'light');
      return;
    case 'solid-color':
      applySolidColorStaticBackground(root, spec.color);
      return;
    case 'transparent':
      applyTransparentStaticBackground(root);
      return;
  }
}

export function createSharedAnimatedBackground(
  width: number,
  height: number,
  spec: SharedExportBackgroundSpec = FALLBACK_SPEC,
): SharedAnimatedBackground {
  switch (spec.id) {
    case 'app-starfield-dark':
      return createAppStarfieldAnimatedBackground(width, height, 'dark');
    case 'app-starfield-light':
      return createAppStarfieldAnimatedBackground(width, height, 'light');
    case 'solid-color':
      return createSolidColorAnimatedBackground(width, height, spec.color);
    case 'transparent':
      return createTransparentAnimatedBackground(width, height);
  }
}

export function renderSharedBackgroundPreviewCanvas(
  width: number,
  height: number,
  spec: SharedExportBackgroundSpec,
  progress = 0,
): HTMLCanvasElement {
  const animated = createSharedAnimatedBackground(width, height, spec);
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = Math.max(1, Math.round(width));
  previewCanvas.height = Math.max(1, Math.round(height));

  const ctx = previewCanvas.getContext('2d');
  if (!ctx) {
    return previewCanvas;
  }

  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx.drawImage(animated.baseCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
  animated.drawOverlayFrame(ctx, progress);
  return previewCanvas;
}

function applyAppStarfieldStaticBackground(
  root: HTMLElement,
  width: number,
  height: number,
  variant: 'dark' | 'light',
): void {
  if (variant === 'dark') {
    root.style.backgroundColor = '#020617';
    root.style.background =
      'radial-gradient(circle at 20% 18%, rgba(59, 130, 246, 0.18), transparent 36%), radial-gradient(circle at 84% 20%, rgba(16, 185, 129, 0.16), transparent 34%), linear-gradient(180deg, rgba(15, 23, 42, 0.62), rgba(2, 6, 23, 0.95)), #020617';
  } else {
    root.style.backgroundColor = '#f8fafc';
    root.style.background =
      'radial-gradient(ellipse at top left, rgba(224, 231, 255, 0.88), rgba(248, 250, 252, 0.94) 56%, rgba(255, 255, 255, 0.98) 100%), linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98)), #f8fafc';
  }

  const areaScale = Math.max(0.8, Math.min(1.5, (width * height) / (1280 * 720)));
  const starsSmall = createStarFieldShadow(
    Math.round((variant === 'dark' ? 340 : 500) * areaScale),
    width,
    height,
    variant === 'dark' ? DARK_STAR_COLORS_SMALL : LIGHT_STAR_COLORS_SMALL,
  );
  const starsMedium = createStarFieldShadow(
    Math.round((variant === 'dark' ? 130 : 200) * areaScale),
    width,
    height,
    variant === 'dark' ? DARK_STAR_COLORS_MEDIUM : LIGHT_STAR_COLORS_MEDIUM,
  );
  const starsLarge = createStarFieldShadow(
    Math.round((variant === 'dark' ? 58 : 80) * areaScale),
    width,
    height,
    variant === 'dark' ? DARK_STAR_COLORS_LARGE : LIGHT_STAR_COLORS_LARGE,
  );

  root.appendChild(createStaticStarLayer(1, starsSmall));
  root.appendChild(createStaticStarLayer(2, starsMedium));
  root.appendChild(createStaticStarLayer(3, starsLarge));
}

function applySolidColorStaticBackground(root: HTMLElement, color: string): void {
  root.style.backgroundColor = color;
  root.style.background = color;
}

function applyTransparentStaticBackground(root: HTMLElement): void {
  root.style.backgroundColor = 'transparent';
  root.style.background = 'transparent';
}

function createAppStarfieldAnimatedBackground(
  width: number,
  height: number,
  variant: 'dark' | 'light',
): SharedAnimatedBackground {
  const baseCanvas = buildStarfieldBaseCanvas(width, height, variant);
  const layers = generateStarfieldLayers(width, height, variant);

  return {
    baseCanvas,
    drawOverlayFrame(ctx, progress) {
      drawStarfieldAnimatedStars(ctx, height, layers, progress);
    },
  };
}

function createSolidColorAnimatedBackground(
  width: number,
  height: number,
  color: string,
): SharedAnimatedBackground {
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  const ctx = baseCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }

  return {
    baseCanvas,
    drawOverlayFrame() {
      return;
    },
  };
}

function createTransparentAnimatedBackground(
  width: number,
  height: number,
): SharedAnimatedBackground {
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  return {
    baseCanvas,
    drawOverlayFrame() {
      return;
    },
  };
}

function createStaticStarLayer(sizePx: number, shadow: string): HTMLDivElement {
  const layer = document.createElement('div');
  applyInlineStyles(layer, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    overflow: 'hidden',
  });

  const star = document.createElement('div');
  applyInlineStyles(star, {
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
}

function createStarFieldShadow(
  count: number,
  width: number,
  height: number,
  colors: readonly string[],
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

function buildStarfieldBaseCanvas(
  width: number,
  height: number,
  variant: 'dark' | 'light',
): HTMLCanvasElement {
  const backgroundCanvas = document.createElement('canvas');
  backgroundCanvas.width = width;
  backgroundCanvas.height = height;
  const ctx = backgroundCanvas.getContext('2d');
  if (!ctx) {
    return backgroundCanvas;
  }

  if (variant === 'dark') {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const depthGradient = ctx.createLinearGradient(0, 0, 0, height);
    depthGradient.addColorStop(0, 'rgba(15, 23, 42, 0.62)');
    depthGradient.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
    ctx.fillStyle = depthGradient;
    ctx.fillRect(0, 0, width, height);

    const blueWash = ctx.createLinearGradient(0, 0, width * 0.62, height * 0.58);
    blueWash.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
    blueWash.addColorStop(0.7, 'rgba(59, 130, 246, 0.04)');
    blueWash.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = blueWash;
    ctx.fillRect(0, 0, width, height);

    const greenWash = ctx.createLinearGradient(width, height * 0.08, width * 0.38, height * 0.72);
    greenWash.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    greenWash.addColorStop(0.7, 'rgba(16, 185, 129, 0.03)');
    greenWash.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = greenWash;
    ctx.fillRect(0, 0, width, height);
    return backgroundCanvas;
  }

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const leftGlow = ctx.createRadialGradient(
    width * 0.16,
    height * 0.18,
    0,
    width * 0.16,
    height * 0.18,
    width * 0.82,
  );
  leftGlow.addColorStop(0, 'rgba(224, 231, 255, 0.92)');
  leftGlow.addColorStop(0.55, 'rgba(248, 250, 252, 0.38)');
  leftGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, width, height);

  const rightGlow = ctx.createRadialGradient(
    width * 0.84,
    height * 0.14,
    0,
    width * 0.84,
    height * 0.14,
    width * 0.74,
  );
  rightGlow.addColorStop(0, 'rgba(186, 230, 253, 0.52)');
  rightGlow.addColorStop(0.6, 'rgba(241, 245, 249, 0.24)');
  rightGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, width, height);

  return backgroundCanvas;
}

function generateStarfieldLayers(
  width: number,
  height: number,
  variant: 'dark' | 'light',
): GeneratedStarLayer[] {
  const area = width * height;
  const densityFactor = Math.max(0.8, Math.min(1.4, area / (1080 * 1080)));

  if (variant === 'dark') {
    return [
      createStarLayer(
        Math.round(220 * densityFactor),
        1,
        0.44,
        DARK_STAR_COLORS_SMALL,
        width,
        height,
        [0.35, 0.75],
      ),
      createStarLayer(
        Math.round(120 * densityFactor),
        2,
        0.32,
        DARK_STAR_COLORS_MEDIUM,
        width,
        height,
        [0.45, 0.85],
      ),
      createStarLayer(
        Math.round(70 * densityFactor),
        3,
        0.22,
        DARK_STAR_COLORS_LARGE,
        width,
        height,
        [0.55, 0.95],
      ),
    ];
  }

  return [
    createStarLayer(
      Math.round(260 * densityFactor),
      1,
      0.44,
      LIGHT_STAR_COLORS_SMALL,
      width,
      height,
      [0.35, 0.75],
    ),
    createStarLayer(
      Math.round(150 * densityFactor),
      2,
      0.32,
      LIGHT_STAR_COLORS_MEDIUM,
      width,
      height,
      [0.45, 0.85],
    ),
    createStarLayer(
      Math.round(90 * densityFactor),
      3,
      0.22,
      LIGHT_STAR_COLORS_LARGE,
      width,
      height,
      [0.55, 0.95],
    ),
  ];
}

function createStarLayer(
  count: number,
  size: number,
  speed: number,
  colors: readonly string[],
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
      color: colors[Math.floor(Math.random() * colors.length)] ?? '#cbd5e1',
    });
  }

  return { size, speed, stars };
}

function drawStarfieldAnimatedStars(
  ctx: CanvasRenderingContext2D,
  height: number,
  layers: GeneratedStarLayer[],
  progress: number,
): void {
  for (const layer of layers) {
    const travel = height + 240;
    for (const star of layer.stars) {
      let y = star.y - progress * travel * layer.speed;
      y = (((y % travel) + travel) % travel) - 120;
      const wrappedY = y + travel;

      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, y, layer.size, layer.size);
      if (wrappedY < height + layer.size) {
        ctx.fillRect(star.x, wrappedY, layer.size, layer.size);
      }
    }
  }

  ctx.globalAlpha = 1;
}

function applyInlineStyles(element: HTMLElement, styles: Record<string, string>): void {
  for (const [property, value] of Object.entries(styles)) {
    if (!value) {
      continue;
    }

    element.style.setProperty(toCssPropertyName(property), value);
  }
}

function toCssPropertyName(property: string): string {
  return property.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
