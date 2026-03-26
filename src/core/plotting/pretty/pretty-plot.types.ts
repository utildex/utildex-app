import type { SharedExportBackgroundSpec } from '../../export/shared-export-backgrounds';

export type PrettyPlotXValue = number | Date;

export interface PrettyPlotPoint {
  x: PrettyPlotXValue;
  y: number;
}

export interface PrettyPlotSeriesStyle {
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface PrettyPlotSeries {
  id: string;
  label?: string;
  points: PrettyPlotPoint[];
  style?: PrettyPlotSeriesStyle;
}

export interface PrettyPlotLegendOptions {
  enabled: boolean;
}

export interface PrettyPlotGridOptions {
  enabled: boolean;
}

export interface PrettyPlotTooltipOptions {
  enabled: boolean;
}

export type PrettyPlotCurve = 'linear' | 'smooth';

export interface PrettyPlotTheme {
  fontFamily: string;
  textColor: string;
  axisColor: string;
  gridColor: string;
  backgroundColor: string;
  palette: string[];
}

export interface PrettyPlotLayout {
  width?: number;
  height?: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export interface PrettyPlotConfig {
  series: PrettyPlotSeries[];
  xLabel?: string;
  yLabel?: string;
  curve: PrettyPlotCurve;
  layout: PrettyPlotLayout;
  legend: PrettyPlotLegendOptions;
  grid: PrettyPlotGridOptions;
  tooltip: PrettyPlotTooltipOptions;
  theme: PrettyPlotTheme;
}

export type PrettyPlotModifier = (config: PrettyPlotConfig) => PrettyPlotConfig;

export type PrettyPlotStaticExportFormat = 'png' | 'jpg' | 'svg';

export interface PrettyPlotStaticExportRequest {
  format: PrettyPlotStaticExportFormat;
  pixelRatio: number;
  jpegQuality: number;
  background: SharedExportBackgroundSpec;
}

export interface PrettyPlotGifExportRequest {
  fps: number;
  durationMs: number;
  maxColors: number;
  background: SharedExportBackgroundSpec;
}

export interface PrettyPlotExportResponse {
  outputUrl: string;
  filename: string;
}

export interface PrettyPlotRendererHandle {
  update(config: PrettyPlotConfig): void;
  resize(): void;
  destroy(): void;
  exportStatic(request: PrettyPlotStaticExportRequest): Promise<PrettyPlotExportResponse>;
  exportGif(request: PrettyPlotGifExportRequest): Promise<PrettyPlotExportResponse>;
}

export interface PrettyPlotSingleSeriesInput {
  id?: string;
  label?: string;
  data: Array<[number | Date, number] | PrettyPlotPoint>;
}

export interface PrettyPlotSharedXInput {
  x: Array<number | Date>;
  series: Array<{
    id: string;
    label?: string;
    y: number[];
    style?: PrettyPlotSeriesStyle;
  }>;
}
