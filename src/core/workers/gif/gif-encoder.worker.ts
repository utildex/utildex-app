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
  const paletteSource = buildPaletteSource(normalizedFrames);
  const sharedPalette = gifenc.quantize(paletteSource, maxColors, { format });

  let totalDuration = 0;

  normalizedFrames.forEach((frame, index) => {
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
): Uint8Array {
  const maxSampleFrames = Math.min(6, frames.length);
  const frameStride = Math.max(1, Math.floor(frames.length / maxSampleFrames));
  const pixelStride = 4;
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
  const sampledPixelsPerFrame = Math.ceil(pixelsPerFrame / pixelStride);
  const buffer = new Uint8Array(sampledFrames.length * sampledPixelsPerFrame * 4);
  let writeOffset = 0;

  for (const frame of sampledFrames) {
    for (let pixelIndex = 0; pixelIndex < pixelsPerFrame; pixelIndex += pixelStride) {
      const rgbaIndex = pixelIndex * 4;
      buffer[writeOffset] = frame.rgba[rgbaIndex];
      buffer[writeOffset + 1] = frame.rgba[rgbaIndex + 1];
      buffer[writeOffset + 2] = frame.rgba[rgbaIndex + 2];
      buffer[writeOffset + 3] = frame.rgba[rgbaIndex + 3];
      writeOffset += 4;
    }
  }

  return buffer;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
