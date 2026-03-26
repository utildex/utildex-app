# Pretty Plotting Platform

## Purpose

The plotting platform under `src/core/plotting/pretty` provides a reusable D3-based line plotting layer for tool UIs.

It standardizes:

- config shape for series, theme, layout, and interaction flags
- render lifecycle (`create`, `update`, `resize`, `destroy`)
- static export and GIF export integration

## Core Modules

- `pretty-plot.types.ts`
  - shared config and request/response contracts
- `pretty-plot.presets.ts`
  - quick builders for common input shapes
- `pretty-plot.modifiers.ts`
  - composable config transforms
- `pretty-plot.renderer.ts`
  - D3 renderer implementation with export hooks
- `pretty-plot.engine.ts`
  - public factory that returns a stable renderer handle
- `index.ts`
  - public exports for platform consumers

## Bootstrap: Create and Render a Plot

```ts
import {
  createPrettyPlot,
  singleSeriesPreset,
  withCurve,
  withGrid,
  withTooltip,
} from '../core/plotting/pretty';

const baseConfig = singleSeriesPreset({
  id: 'series-1',
  label: 'Series 1',
  data: [
    [0, 1.2],
    [1, 1.8],
    [2, 2.9],
    [3, 2.2],
    [4, 3.8],
  ],
});

const handle = createPrettyPlot(containerElement, baseConfig, [
  withCurve('smooth'),
  withGrid(true),
  withTooltip(true),
]);
```

## Bootstrap: Update and Resize

```ts
handle.update({
  ...baseConfig,
  xLabel: 'Time',
  yLabel: 'Value',
  theme: {
    ...baseConfig.theme,
    backgroundColor: '#0b1220',
  },
});

window.addEventListener('resize', () => {
  handle.resize();
});
```

## Bootstrap: Export Static and GIF

```ts
const png = await handle.exportStatic({
  format: 'png',
  pixelRatio: 2,
  jpegQuality: 0.95,
  background: { id: 'app-starfield-dark' },
});

const gif = await handle.exportGif({
  fps: 12,
  durationMs: 3200,
  maxColors: 256,
  background: { id: 'app-starfield-dark' },
});

// png.outputUrl / gif.outputUrl are object URLs.
// Use them for download or preview, then revoke after use.
```

## Presets and Modifiers

Presets are useful for fast setup from typical data structures:

- `singleSeriesPreset`
- `multiSeriesSharedXPreset`
- `multiSeriesStyledPreset`

Modifiers keep feature flags explicit and composable:

- `withCurve`
- `withGrid`
- `withTooltip`
- `withLegend`
- `withLabels`
- `withPalette`
- `withSeriesStyles`

This allows each tool to define behavior without duplicating renderer internals.

## Lifecycle Expectations

- create one renderer handle per host element
- call `update` when config changes
- call `resize` when container dimensions change
- call `destroy` when the host view is disposed

```ts
handle.destroy();
```

## Integration Notes

- Use `pretty-plot.types.ts` contracts in tool kernels to keep input validation separate from rendering.
- Keep parsing and normalization in tool-level kernels; keep plotting core focused on rendering/export.
- Reuse shared export background specs for consistent static/GIF output across tools.
