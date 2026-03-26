import { getFontEmbedCSS, toJpeg, toPng, toSvg } from 'html-to-image';
import {
  SharedGifAnimationProvider,
  type SharedGifEncodeOptions,
  type SharedGifEncodeResult,
  type SharedGifFrame,
  type SharedGifQualityProfile,
  type SharedGifRenderRequest,
} from './shared-gif-animation.provider';

export type SharedStaticExportFormat = 'png' | 'jpg' | 'svg';

export interface SharedStaticExportQuality {
  pixelRatio: number;
  jpegQuality: number;
}

export interface SharedStaticExportOptions {
  backgroundColor?: string;
}

export type {
  SharedGifFrame,
  SharedGifEncodeOptions,
  SharedGifEncodeResult,
  SharedGifRenderRequest,
  SharedGifQualityProfile,
};

export class SharedExportRenderer {
  private fontEmbedCss: string | null = null;
  private readonly gifProvider = new SharedGifAnimationProvider();

  async renderStatic(
    node: HTMLElement,
    format: SharedStaticExportFormat,
    quality: SharedStaticExportQuality,
    options: SharedStaticExportOptions = {},
  ): Promise<string> {
    const fontEmbedCSS = await this.getFontEmbedCss(node);
    const baseOptions = {
      cacheBust: true,
      fontEmbedCSS,
      backgroundColor: options.backgroundColor,
      style: {
        opacity: '1',
      },
    };

    if (format === 'jpg') {
      return toJpeg(node, {
        ...baseOptions,
        quality: quality.jpegQuality,
        pixelRatio: quality.pixelRatio,
      });
    }

    if (format === 'svg') {
      return toSvg(node, baseOptions);
    }

    return toPng(node, {
      ...baseOptions,
      pixelRatio: quality.pixelRatio,
    });
  }

  async renderGif(request: SharedGifRenderRequest): Promise<string> {
    return this.gifProvider.render(request);
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
}
