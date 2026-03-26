# GIF Export Platform

## Purpose

The GIF export stack is centralized to keep tool-level code simple and consistent:

- frame composition is handled by `SharedExportRenderer.renderGif`
- GIF bytes are encoded in a dedicated worker (`gif-encoder.worker.ts`)
- quality behavior is controlled through profile-based policy in `SharedGifAnimationProvider`

This design avoids per-tool encoder implementations and keeps quality controls in one place.

## Core Components

- `src/core/export/shared-export-renderer.ts`
  - public entry point for static exports and GIF exports
- `src/core/export/shared-gif-animation.provider.ts`
  - builds frame sequence, applies policy profiles, forwards options to encoder
- `src/core/workers/gif/gif-encoder.runtime.ts`
  - runtime bridge that sends frame payloads to the worker
- `src/core/workers/gif/gif-encoder.worker.ts`
  - quantization, palette application, anti-banding pre-pass, GIF byte output
- `src/core/workers/gif/gif-encoder.contract.ts`
  - shared request/response option types

## Quality Profiles

Current profiles:

- `reliable`
  - quality-first behavior for gradient-heavy scenes
  - fixed 256 colors
  - anti-banding enabled
  - denser palette sampling
- `balanced`
  - reduced size with moderate quality safeguards
- `compact`
  - smallest output priority

For platform-level defaults, use `reliable` unless file size constraints are strict.

## Bootstrap: Minimal GIF Export

```ts
import { SharedExportRenderer } from '../core/export/shared-export-renderer';
import { encodeGifWithRuntimeWorker } from '../core/workers/gif/gif-encoder.runtime';

const renderer = new SharedExportRenderer();

export async function exportElementAsGif(sourceNode: HTMLElement): Promise<string> {
  const width = sourceNode.clientWidth;
  const height = sourceNode.clientHeight;

  return renderer.renderGif({
    sourceNode,
    width,
    height,
    profile: 'reliable',
    fps: 12,
    durationMs: 3200,
    drawFrame: (ctx, frameProgress, sourceImage) => {
      // Replace with tool-specific animation drawing.
      // This example only redraws the source node each frame.
      void frameProgress;
      ctx.drawImage(sourceImage, 0, 0, width, height);
    },
    encodeGif: async (frames, options) => {
      const encoded = await encodeGifWithRuntimeWorker(frames, options);
      return { blob: new Blob([encoded.bytes], { type: 'image/gif' }) };
    },
  });
}
```

## Bootstrap: If You Need Custom Encoding Parameters

Use this only if a tool has specific requirements that profile defaults cannot satisfy.

```ts
const encoded = await encodeGifWithRuntimeWorker(frames, {
  repeat: 0,
  maxColors: 256,
  quantizeFormat: 'rgb565',
  paletteSampleFrames: 12,
  paletteTargetPixelsPerFrame: 140000,
  antiBanding: true,
  antiBandingStrength: 1.35,
});
```

## Integration Notes

- Keep tool code focused on `drawFrame` composition; avoid tool-specific quantization logic.
- Prefer a shared background composer (`shared-export-backgrounds.ts`) when animating overlays.
- Keep GIF options profile-driven for predictable output across tools.
- Route all worker requests through `encodeGifWithRuntimeWorker` to preserve contract consistency.

## Operational Constraints

- GIF color space is palette-limited and cannot preserve full gradient fidelity in all scenes.
- Quality controls reduce visible artifacts but do not remove format limits.
- Higher sampling and anti-banding improve output at the cost of CPU and export time.
