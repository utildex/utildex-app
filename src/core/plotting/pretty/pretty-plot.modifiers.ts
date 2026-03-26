import {
  type PrettyPlotConfig,
  type PrettyPlotModifier,
  type PrettyPlotSeriesStyle,
} from './pretty-plot.types';

export function applyModifiers(
  baseConfig: PrettyPlotConfig,
  modifiers: PrettyPlotModifier[] = [],
): PrettyPlotConfig {
  return modifiers.reduce((config, modifier) => modifier(config), baseConfig);
}

export function withSeriesStyles(
  styleMap: Record<string, PrettyPlotSeriesStyle>,
): PrettyPlotModifier {
  return (config) => ({
    ...config,
    series: config.series.map((series) => ({
      ...series,
      style: {
        ...series.style,
        ...(styleMap[series.id] ?? {}),
      },
    })),
  });
}

export function withPalette(palette: string[]): PrettyPlotModifier {
  return (config) => ({
    ...config,
    theme: {
      ...config.theme,
      palette: palette.slice(),
    },
  });
}

export function withCurve(curve: PrettyPlotConfig['curve']): PrettyPlotModifier {
  return (config) => ({
    ...config,
    curve,
  });
}

export function withLegend(enabled: boolean): PrettyPlotModifier {
  return (config) => ({
    ...config,
    legend: { enabled },
  });
}

export function withGrid(enabled: boolean): PrettyPlotModifier {
  return (config) => ({
    ...config,
    grid: { enabled },
  });
}

export function withTooltip(enabled: boolean): PrettyPlotModifier {
  return (config) => ({
    ...config,
    tooltip: { enabled },
  });
}

export function withLabels(labels: { xLabel?: string; yLabel?: string }): PrettyPlotModifier {
  return (config) => ({
    ...config,
    xLabel: labels.xLabel ?? config.xLabel,
    yLabel: labels.yLabel ?? config.yLabel,
  });
}
