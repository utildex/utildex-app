import {
  type PrettyPlotConfig,
  type PrettyPlotPoint,
  type PrettyPlotSeries,
  type PrettyPlotSeriesStyle,
  type PrettyPlotSharedXInput,
  type PrettyPlotSingleSeriesInput,
} from './pretty-plot.types';

export const PRETTY_PLOT_SERIES_PALETTE = [
  '#38bdf8',
  '#34d399',
  '#f59e0b',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
] as const;

const DEFAULT_THEME = {
  fontFamily: "'Merriweather', Georgia, serif",
  textColor: '#e2e8f0',
  axisColor: '#94a3b8',
  gridColor: 'rgba(148, 163, 184, 0.24)',
  backgroundColor: '#020617',
  palette: PRETTY_PLOT_SERIES_PALETTE,
} as const;

const DEFAULT_LAYOUT = {
  marginTop: 16,
  marginRight: 20,
  marginBottom: 36,
  marginLeft: 46,
} as const;

export function singleSeriesPreset(
  input: PrettyPlotSingleSeriesInput,
  options: {
    xLabel?: string;
    yLabel?: string;
  } = {},
): PrettyPlotConfig {
  const series: PrettyPlotSeries = {
    id: input.id ?? 'series-1',
    label: input.label ?? 'Series 1',
    points: normalizeSingleSeriesData(input.data),
  };

  return {
    series: [series],
    xLabel: options.xLabel,
    yLabel: options.yLabel,
    curve: 'smooth',
    layout: {
      ...DEFAULT_LAYOUT,
      width: undefined,
      height: undefined,
    },
    legend: { enabled: false },
    grid: { enabled: true },
    tooltip: { enabled: true },
    theme: {
      ...DEFAULT_THEME,
      palette: [...DEFAULT_THEME.palette],
    },
  };
}

export function multiSeriesSharedXPreset(
  input: PrettyPlotSharedXInput,
  options: {
    xLabel?: string;
    yLabel?: string;
  } = {},
): PrettyPlotConfig {
  return {
    series: normalizeSharedXSeries(input),
    xLabel: options.xLabel,
    yLabel: options.yLabel,
    curve: 'smooth',
    layout: {
      ...DEFAULT_LAYOUT,
      width: undefined,
      height: undefined,
    },
    legend: { enabled: true },
    grid: { enabled: true },
    tooltip: { enabled: true },
    theme: {
      ...DEFAULT_THEME,
      palette: [...DEFAULT_THEME.palette],
    },
  };
}

export function multiSeriesStyledPreset(
  input: PrettyPlotSharedXInput,
  styleMap: Record<string, PrettyPlotSeriesStyle>,
  options: {
    xLabel?: string;
    yLabel?: string;
  } = {},
): PrettyPlotConfig {
  const base = multiSeriesSharedXPreset(input, options);

  return {
    ...base,
    series: base.series.map((series) => ({
      ...series,
      style: {
        ...series.style,
        ...(styleMap[series.id] ?? {}),
      },
    })),
  };
}

function normalizeSingleSeriesData(input: PrettyPlotSingleSeriesInput['data']): PrettyPlotPoint[] {
  return input
    .map((item) => {
      if (Array.isArray(item)) {
        return { x: item[0], y: item[1] };
      }
      return item;
    })
    .filter((point) => Number.isFinite(point.y));
}

function normalizeSharedXSeries(input: PrettyPlotSharedXInput): PrettyPlotSeries[] {
  return input.series
    .map((seriesItem) => {
      const points: PrettyPlotPoint[] = input.x
        .map((xValue, index) => ({
          x: xValue,
          y: seriesItem.y[index] ?? Number.NaN,
        }))
        .filter((point) => Number.isFinite(point.y));

      return {
        id: seriesItem.id,
        label: seriesItem.label ?? seriesItem.id,
        points,
        style: seriesItem.style,
      };
    })
    .filter((series) => series.points.length > 0);
}
