/// <reference lib="webworker" />

import type {
  RuntimeGifEncodeOptions,
  RuntimeGifEncodeWorkerRequest,
  RuntimeGifEncodeWorkerResponse,
} from './gif-encoder.contract';

type GifencModule = {
  GIFEncoder: (opts?: Record<string, unknown>) => {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      opts?: Record<string, unknown>,
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };
  quantize: (
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: Record<string, unknown>,
  ) => number[][];
  applyPalette: (
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: string,
  ) => Uint8Array;
};

addEventListener('message', async ({ data }: MessageEvent<RuntimeGifEncodeWorkerRequest>) => {
  if (data.action !== 'encode') {
    return;
  }

  try {
    const encoded = await encodeFrames(data.frames, data.options ?? {});
    const transferableBytes = Uint8Array.from(encoded.bytes);
    const response: RuntimeGifEncodeWorkerResponse = {
      id: data.id,
      ok: true,
      bytes: transferableBytes.buffer,
      frameCount: encoded.frameCount,
      width: encoded.width,
      height: encoded.height,
      durationMs: encoded.durationMs,
    };
    postMessage(response, [transferableBytes.buffer]);
  } catch (error) {
    const response: RuntimeGifEncodeWorkerResponse = {
      id: data.id,
      ok: false,
      error: error instanceof Error ? error.message : 'GIF encoding failed.',
    };
    postMessage(response);
  }
});

async function encodeFrames(
  frames: RuntimeGifEncodeWorkerRequest['frames'],
  options: RuntimeGifEncodeOptions,
): Promise<{
  bytes: Uint8Array;
  frameCount: number;
  width: number;
  height: number;
  durationMs: number;
}> {
  if (!frames.length) {
    throw new Error('GIF export requires at least one frame.');
  }

  const first = frames[0];
  const width = first.width;
  const height = first.height;

  const normalizedFrames = frames.map((frame) => {
    if (frame.width !== width || frame.height !== height) {
      throw new Error('All GIF frames must share the same width and height.');
    }

    const rgba = new Uint8Array(frame.rgba);
    if (rgba.length !== width * height * 4) {
      throw new Error('A GIF frame has invalid RGBA byte length.');
    }

    return {
      rgba,
      width: frame.width,
      height: frame.height,
      delayMs: frame.delayMs,
    };
  });

  // @ts-expect-error no declaration file for gifenc ESM build
  const gifenc = (await import('gifenc/dist/gifenc.esm.js')) as GifencModule;
  const gif = gifenc.GIFEncoder();

  const repeat = options.repeat ?? 0;
  const maxColors = clamp(options.maxColors ?? 192, 2, 256);
  const format = options.quantizeFormat ?? 'rgb565';
  const antiBanding = options.antiBanding ?? false;
  const antiBandingStrength = clamp(options.antiBandingStrength ?? 1.1, 0, 3);
  const paletteSampleFrames = clamp(options.paletteSampleFrames ?? 8, 2, 24);
  const paletteTargetPixelsPerFrame = clamp(
    options.paletteTargetPixelsPerFrame ?? 60000,
    2000,
    200000,
  );

  const processedFrames = antiBanding
    ? normalizedFrames.map((frame, frameIndex) => {
        const dithered = new Uint8Array(frame.rgba);
        applyAntiBandingDitherInPlace(
          dithered,
          frame.width,
          frame.height,
          frameIndex,
          antiBandingStrength,
        );
        return {
          ...frame,
          rgba: dithered,
        };
      })
    : normalizedFrames;

  const paletteSource = buildPaletteSource(
    processedFrames,
    paletteSampleFrames,
    paletteTargetPixelsPerFrame,
  );
  const sharedPalette = gifenc.quantize(paletteSource, maxColors, { format });

  let totalDuration = 0;

  processedFrames.forEach((frame, index) => {
    const delay = Math.max(20, Math.round(frame.delayMs ?? 90));
    totalDuration += delay;

    const bitmap = gifenc.applyPalette(frame.rgba, sharedPalette, format);

    gif.writeFrame(bitmap, width, height, {
      palette: sharedPalette,
      delay,
      repeat: index === 0 ? repeat : undefined,
    });
  });

  gif.finish();

  const bytes = Uint8Array.from(gif.bytes() as Uint8Array);
  return {
    bytes,
    frameCount: normalizedFrames.length,
    width,
    height,
    durationMs: totalDuration,
  };
}

function buildPaletteSource(
  frames: Array<{ rgba: Uint8Array; width: number; height: number }>,
  requestedSampleFrames: number,
  targetPixelsPerFrame: number,
): Uint8Array {
  const maxSampleFrames = Math.min(requestedSampleFrames, frames.length);
  const frameStride = Math.max(1, Math.floor(frames.length / maxSampleFrames));
  const sampledFrames: Array<{ rgba: Uint8Array; width: number; height: number }> = [];

  for (
    let index = 0;
    index < frames.length && sampledFrames.length < maxSampleFrames;
    index += frameStride
  ) {
    sampledFrames.push(frames[index]);
  }
  if (sampledFrames[sampledFrames.length - 1] !== frames[frames.length - 1]) {
    sampledFrames[sampledFrames.length - 1] = frames[frames.length - 1];
  }

  const pixelsPerFrame = sampledFrames[0].width * sampledFrames[0].height;
  const sampleStep = Math.max(1, Math.ceil(Math.sqrt(pixelsPerFrame / targetPixelsPerFrame)));
  const sampledPixelsPerFrame =
    Math.ceil(sampledFrames[0].height / sampleStep) *
    Math.ceil(sampledFrames[0].width / sampleStep);
  const buffer = new Uint8Array(sampledFrames.length * sampledPixelsPerFrame * 4);
  let writeOffset = 0;

  for (const frame of sampledFrames) {
    for (let y = 0; y < frame.height; y += sampleStep) {
      for (let x = 0; x < frame.width; x += sampleStep) {
        const rgbaIndex = (y * frame.width + x) * 4;
        buffer[writeOffset] = frame.rgba[rgbaIndex];
        buffer[writeOffset + 1] = frame.rgba[rgbaIndex + 1];
        buffer[writeOffset + 2] = frame.rgba[rgbaIndex + 2];
        buffer[writeOffset + 3] = frame.rgba[rgbaIndex + 3];
        writeOffset += 4;
      }
    }
  }

  return writeOffset === buffer.length ? buffer : buffer.subarray(0, writeOffset);
}

function applyAntiBandingDitherInPlace(
  rgba: Uint8Array,
  width: number,
  height: number,
  frameIndex: number,
  strength: number,
): void {
  const bayer4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = rgba[offset + 3];
      if (alpha < 8) {
        continue;
      }

      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];

      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const darkBoost = 1 + Math.pow(1 - luminance, 1.6) * 0.9;

      const bayerIndex = ((y & 3) << 2) | (x & 3);
      const ordered = (bayer4[bayerIndex] - 7.5) / 7.5;
      const temporal = (((x * 13 + y * 17 + frameIndex * 19) & 7) - 3.5) / 7;
      const delta = (ordered * 0.8 + temporal * 0.2) * strength * darkBoost;

      rgba[offset] = clampByte(r + delta);
      rgba[offset + 1] = clampByte(g + delta);
      rgba[offset + 2] = clampByte(b + delta);
    }
  }
}

function clampByte(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 255) {
    return 255;
  }
  return Math.round(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
