export type ResizeMode = 'percent' | 'dimensions';

export interface DimensionInput {
  originalWidth: number;
  originalHeight: number;
  mode: ResizeMode;
  percentage: number;
  targetWidth: number | null;
  targetHeight: number | null;
  lockRatio: boolean;
}

export function calculateResizedDimensions(input: DimensionInput): { w: number; h: number } {
  if (input.mode === 'percent') {
    const p = input.percentage / 100;
    return {
      w: Math.round(input.originalWidth * p),
      h: Math.round(input.originalHeight * p),
    };
  }

  if (!input.lockRatio) {
    return {
      w: input.targetWidth || input.originalWidth,
      h: input.targetHeight || input.originalHeight,
    };
  }

  const tW = input.targetWidth;
  const tH = input.targetHeight;
  if (!tW && !tH) return { w: input.originalWidth, h: input.originalHeight };

  const ratio = input.originalWidth / input.originalHeight;
  if (tW && !tH) return { w: tW, h: Math.round(tW / ratio) };
  if (!tW && tH) return { w: Math.round(tH * ratio), h: tH };

  const scaleW = tW! / input.originalWidth;
  const scaleH = tH! / input.originalHeight;
  const scale = Math.min(scaleW, scaleH);
  return {
    w: Math.round(input.originalWidth * scale),
    h: Math.round(input.originalHeight * scale),
  };
}

export async function resizeImageBlob(
  sourceUrl: string,
  width: number,
  height: number,
  format: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject('Failed to get 2D canvas context');
      return;
    }

    const imageObj = new Image();
    imageObj.src = sourceUrl;

    imageObj.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageObj, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject('Failed to create blob from canvas');
        },
        format,
        quality,
      );
    };

    imageObj.onerror = () => reject('Failed to load source image');
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
