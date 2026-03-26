import { D3PrettyPlotRenderer } from './pretty-plot.renderer';
import { applyModifiers } from './pretty-plot.modifiers';
import {
  type PrettyPlotConfig,
  type PrettyPlotModifier,
  type PrettyPlotRendererHandle,
} from './pretty-plot.types';

export function createPrettyPlot(
  container: HTMLElement,
  baseConfig: PrettyPlotConfig,
  modifiers: PrettyPlotModifier[] = [],
): PrettyPlotRendererHandle {
  const renderer = new D3PrettyPlotRenderer(container, applyModifiers(baseConfig, modifiers));

  return {
    update(config: PrettyPlotConfig) {
      renderer.update(applyModifiers(config, modifiers));
    },
    resize() {
      renderer.resize();
    },
    destroy() {
      renderer.destroy();
    },
    exportStatic(request) {
      return renderer.exportStatic(request);
    },
    exportGif(request) {
      return renderer.exportGif(request);
    },
  };
}
