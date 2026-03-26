import { getFontEmbedCSS, toPng } from 'html-to-image';

export type SharedGifQualityProfile = 'reliable' | 'balanced' | 'compact';

export interface SharedGifFrame {
  rgba: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  delayMs?: number;
}

export interface SharedGifEncodeOptions {
  repeat?: number;
  maxColors?: number;
  quantizeFormat?: 'rgb565' | 'rgb444';
  paletteSampleFrames?: number;
  paletteTargetPixelsPerFrame?: number;
  antiBanding?: boolean;
  antiBandingStrength?: number;
}

export interface SharedGifEncodeResult {
  blob: Blob;
}

export interface SharedGifRenderRequest {
  sourceNode: HTMLElement;
  width: number;
  height: number;
  fps?: number;
  durationMs?: number;
  profile?: SharedGifQualityProfile;
  maxColors?: number;
  drawFrame: (
    ctx: CanvasRenderingContext2D,
    frameProgress: number,
    sourceImage: HTMLImageElement,
  ) => void;
  encodeGif: (
    frames: SharedGifFrame[],
    options: SharedGifEncodeOptions,
  ) => Promise<SharedGifEncodeResult>;
}

interface ResolvedGifPolicy {
  fps: number;
  durationMs: number;
  maxColors: number;
  quantizeFormat: 'rgb565' | 'rgb444';
  paletteSampleFrames: number;
  paletteTargetPixelsPerFrame: number;
  antiBanding: boolean;
  antiBandingStrength: number;
}

const GIF_POLICY_BY_PROFILE: Record<SharedGifQualityProfile, ResolvedGifPolicy> = {
  reliable: {
    fps: 12,
    durationMs: 3200,
    maxColors: 256,
    quantizeFormat: 'rgb565',
    paletteSampleFrames: 12,
    paletteTargetPixelsPerFrame: 140000,
    antiBanding: true,
    antiBandingStrength: 1.35,
  },
  balanced: {
    fps: 12,
    durationMs: 3000,
    maxColors: 224,
    quantizeFormat: 'rgb565',
    paletteSampleFrames: 10,
    paletteTargetPixelsPerFrame: 90000,
    antiBanding: true,
    antiBandingStrength: 1,
  },
  compact: {
    fps: 10,
    durationMs: 2600,
    maxColors: 160,
    quantizeFormat: 'rgb565',
    paletteSampleFrames: 8,
    paletteTargetPixelsPerFrame: 50000,
    antiBanding: false,
    antiBandingStrength: 0,
  },
};

export class SharedGifAnimationProvider {
  private fontEmbedCss: string | null = null;

  async render(request: SharedGifRenderRequest): Promise<string> {
    const sourceImage = await this.captureSourceAsImage(request.sourceNode);

    const canvas = document.createElement('canvas');
    canvas.width = request.width;
    canvas.height = request.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Unable to initialize GIF renderer.');
    }

    const policy = this.resolvePolicy(request);
    const frameDelayMs = Math.max(20, Math.round(1000 / policy.fps));
    const frameCount = Math.max(8, Math.round((policy.durationMs / 1000) * policy.fps));

    const frames: SharedGifFrame[] = [];
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const frameProgress = frameIndex / frameCount;
      ctx.clearRect(0, 0, request.width, request.height);
      request.drawFrame(ctx, frameProgress, sourceImage);

      const frameData = ctx.getImageData(0, 0, request.width, request.height);
      frames.push({
        rgba: frameData.data,
        width: request.width,
        height: request.height,
        delayMs: frameDelayMs,
      });
    }

    const result = await request.encodeGif(frames, {
      repeat: 0,
      maxColors: policy.maxColors,
      quantizeFormat: policy.quantizeFormat,
      paletteSampleFrames: policy.paletteSampleFrames,
      paletteTargetPixelsPerFrame: policy.paletteTargetPixelsPerFrame,
      antiBanding: policy.antiBanding,
      antiBandingStrength: policy.antiBandingStrength,
    });

    return URL.createObjectURL(result.blob);
  }

  private resolvePolicy(request: SharedGifRenderRequest): ResolvedGifPolicy {
    const profile = request.profile ?? 'reliable';
    const base = GIF_POLICY_BY_PROFILE[profile];

    const effectiveMaxColors =
      profile === 'reliable' ? base.maxColors : clamp(request.maxColors ?? base.maxColors, 2, 256);

    return {
      ...base,
      fps: Math.max(1, Math.round(request.fps ?? base.fps)),
      durationMs: Math.max(300, Math.round(request.durationMs ?? base.durationMs)),
      maxColors: effectiveMaxColors,
    };
  }

  private async captureSourceAsImage(node: HTMLElement): Promise<HTMLImageElement> {
    const fontEmbedCSS = await this.getFontEmbedCss(node);
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: 'transparent',
      fontEmbedCSS,
      style: {
        opacity: '1',
      },
    });

    return this.loadImage(dataUrl);
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

  private async loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to load rendered export frame.'));
      image.src = dataUrl;
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
