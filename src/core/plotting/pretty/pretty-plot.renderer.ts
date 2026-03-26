import {
  axisBottom,
  axisLeft,
  extent,
  line,
  max,
  pointer,
  type ScaleLinear,
  type Selection,
  scaleLinear,
  select,
  curveLinear,
  curveMonotoneX,
} from 'd3';
import { SharedExportRenderer } from '../../export/shared-export-renderer';
import { encodeGifWithRuntimeWorker } from '../../workers/gif/gif-encoder.runtime';
import {
  applySharedStaticBackground,
  createSharedAnimatedBackground,
  type SharedExportBackgroundSpec,
} from '../../export/shared-export-backgrounds';
import {
  type PrettyPlotConfig,
  type PrettyPlotExportResponse,
  type PrettyPlotGifExportRequest,
  type PrettyPlotRendererHandle,
  type PrettyPlotStaticExportRequest,
  type PrettyPlotXValue,
} from './pretty-plot.types';

const GIF_TRAVEL_PROGRESS_SCALE = 1;

export class D3PrettyPlotRenderer implements PrettyPlotRendererHandle {
  private config: PrettyPlotConfig;
  private readonly svg: SVGSVGElement;
  private readonly exportRenderer = new SharedExportRenderer();
  private readonly legendLayer: HTMLDivElement;
  private readonly tooltipLayer: HTMLDivElement;

  constructor(
    private readonly container: HTMLElement,
    initialConfig: PrettyPlotConfig,
  ) {
    this.config = initialConfig;

    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
    this.container.style.background = this.config.theme.backgroundColor;
    this.container.style.overflow = 'hidden';

    const rootSelection = select(this.container);
    this.svg = rootSelection
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('display', 'block')
      .style('font-family', this.config.theme.fontFamily)
      .node() as SVGSVGElement;

    this.legendLayer = document.createElement('div');
    this.legendLayer.style.position = 'absolute';
    this.legendLayer.style.top = '8px';
    this.legendLayer.style.right = '8px';
    this.legendLayer.style.display = 'flex';
    this.legendLayer.style.flexWrap = 'wrap';
    this.legendLayer.style.gap = '8px';
    this.legendLayer.style.fontSize = '12px';
    this.legendLayer.style.pointerEvents = 'none';
    this.container.appendChild(this.legendLayer);

    this.tooltipLayer = document.createElement('div');
    this.tooltipLayer.style.position = 'absolute';
    this.tooltipLayer.style.display = 'none';
    this.tooltipLayer.style.pointerEvents = 'none';
    this.tooltipLayer.style.padding = '8px 10px';
    this.tooltipLayer.style.borderRadius = '8px';
    this.tooltipLayer.style.background = 'rgba(15, 23, 42, 0.72)';
    this.tooltipLayer.style.backdropFilter = 'blur(12px) saturate(170%)';
    this.tooltipLayer.style.color = '#e2e8f0';
    this.tooltipLayer.style.border = 'none';
    this.tooltipLayer.style.boxShadow =
      '0 12px 28px rgba(2, 6, 23, 0.35), inset 0 0.5px 0 rgba(255,255,255,0.14)';
    this.tooltipLayer.style.fontSize = '12px';
    this.tooltipLayer.style.fontFamily = "'Roboto Mono', ui-monospace, monospace";
    this.container.appendChild(this.tooltipLayer);

    this.render();
  }

  update(config: PrettyPlotConfig): void {
    this.config = config;
    this.container.style.background = this.config.theme.backgroundColor;
    this.render();
  }

  resize(): void {
    this.render();
  }

  destroy(): void {
    this.legendLayer.remove();
    this.tooltipLayer.remove();
    this.svg.remove();
  }

  async exportStatic(request: PrettyPlotStaticExportRequest): Promise<PrettyPlotExportResponse> {
    const exportNode = this.buildExportNode(request.background, true);
    document.body.appendChild(exportNode);

    const forcedOpaqueBackground =
      request.format === 'jpg' && request.background.id === 'transparent' ? '#ffffff' : undefined;

    try {
      const outputUrl = await this.exportRenderer.renderStatic(
        exportNode,
        request.format,
        {
          pixelRatio: request.pixelRatio,
          jpegQuality: request.jpegQuality,
        },
        {
          backgroundColor: forcedOpaqueBackground,
        },
      );

      return {
        outputUrl,
        filename: `pretty-plot.${request.format}`,
      };
    } finally {
      exportNode.remove();
    }
  }

  async exportGif(request: PrettyPlotGifExportRequest): Promise<PrettyPlotExportResponse> {
    const exportNode = this.buildExportNode(request.background, false);
    document.body.appendChild(exportNode);

    try {
      const width = exportNode.clientWidth;
      const height = exportNode.clientHeight;
      const animatedBackground = createSharedAnimatedBackground(width, height, request.background);

      const outputUrl = await this.exportRenderer.renderGif({
        sourceNode: exportNode,
        width,
        height,
        profile: 'reliable',
        fps: request.fps,
        durationMs: request.durationMs,
        maxColors: request.maxColors,
        drawFrame: (ctx, frameProgress, sourceImage) => {
          const progress = frameProgress * GIF_TRAVEL_PROGRESS_SCALE;
          ctx.drawImage(animatedBackground.baseCanvas, 0, 0, width, height);
          animatedBackground.drawOverlayFrame(ctx, progress);
          ctx.drawImage(sourceImage, 0, 0, width, height);
        },
        encodeGif: (frames, options) => {
          return this.encodeGif(frames, options);
        },
      });

      return {
        outputUrl,
        filename: 'pretty-plot.gif',
      };
    } finally {
      exportNode.remove();
    }
  }

  private render(): void {
    const width = this.config.layout.width ?? this.container.clientWidth;
    const height = this.config.layout.height ?? this.container.clientHeight;

    if (!width || !height) {
      return;
    }

    select(this.svg).selectAll('*').remove();

    const chartWidth = width - this.config.layout.marginLeft - this.config.layout.marginRight;
    const chartHeight = height - this.config.layout.marginTop - this.config.layout.marginBottom;

    if (chartWidth <= 0 || chartHeight <= 0 || this.config.series.length === 0) {
      this.legendLayer.style.display = 'none';
      this.tooltipLayer.style.display = 'none';
      return;
    }

    const allPoints = this.config.series.flatMap((series) => series.points);
    if (allPoints.length === 0) {
      this.legendLayer.style.display = 'none';
      this.tooltipLayer.style.display = 'none';
      return;
    }

    const xExtent = extent(allPoints, (point) => point.x.valueOf());
    const yMax = max(allPoints, (point) => point.y) ?? 0;

    const xScale = scaleLinear<number, number>()
      .domain([xExtent[0] ?? 0, xExtent[1] ?? 1])
      .range([0, chartWidth]);

    const yScale = scaleLinear()
      .domain([0, yMax <= 0 ? 1 : yMax])
      .nice()
      .range([chartHeight, 0]);

    const root = select(this.svg)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr(
        'transform',
        `translate(${this.config.layout.marginLeft},${this.config.layout.marginTop})`,
      );

    if (this.config.grid.enabled) {
      root
        .append('g')
        .attr('class', 'y-grid')
        .call(
          axisLeft(yScale)
            .ticks(5)
            .tickSize(-chartWidth)
            .tickFormat(() => ''),
        )
        .selectAll('line')
        .attr('stroke', this.config.theme.gridColor);

      root.selectAll('.y-grid .domain').attr('stroke', 'none');
    }

    root
      .append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(axisBottom(xScale).ticks(6))
      .attr('color', this.config.theme.axisColor);

    root.append('g').call(axisLeft(yScale).ticks(5)).attr('color', this.config.theme.axisColor);

    root
      .selectAll('.tick text')
      .attr('fill', this.config.theme.axisColor)
      .style('font-family', "'Roboto Mono', ui-monospace, monospace")
      .style('font-size', '11px');

    root
      .selectAll('.domain')
      .attr('stroke', this.config.theme.axisColor)
      .attr('stroke-opacity', 0.65);

    const lineBuilder = line<{ x: PrettyPlotXValue; y: number }>()
      .x((point) => xScale(point.x.valueOf()))
      .y((point) => yScale(point.y))
      .defined((point) => Number.isFinite(point.y))
      .curve(this.config.curve === 'smooth' ? curveMonotoneX : curveLinear);

    this.config.series.forEach((series, index) => {
      const color =
        series.style?.color ?? this.config.theme.palette[index % this.config.theme.palette.length];
      const strokeWidth = series.style?.strokeWidth ?? 2.2;
      const dasharray = series.style?.strokeDasharray ?? '';

      root
        .append('path')
        .datum(series.points)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-dasharray', dasharray)
        .attr('d', lineBuilder);
    });

    this.renderLabels(root, chartWidth, chartHeight);
    this.renderLegend();

    if (this.config.tooltip.enabled) {
      this.bindTooltip(root, xScale, yScale, chartWidth, chartHeight);
    } else {
      this.tooltipLayer.style.display = 'none';
    }
  }

  private renderLabels(
    root: Selection<SVGGElement, unknown, null, undefined>,
    chartWidth: number,
    chartHeight: number,
  ): void {
    if (this.config.xLabel) {
      root
        .append('text')
        .attr('x', chartWidth)
        .attr('y', chartHeight + 32)
        .attr('text-anchor', 'end')
        .attr('fill', this.config.theme.textColor)
        .style('font-size', '12px')
        .text(this.config.xLabel);
    }

    if (this.config.yLabel) {
      root
        .append('text')
        .attr('x', 0)
        .attr('y', -6)
        .attr('text-anchor', 'start')
        .attr('fill', this.config.theme.textColor)
        .style('font-size', '12px')
        .text(this.config.yLabel);
    }
  }

  private renderLegend(): void {
    this.legendLayer.innerHTML = '';

    if (!this.config.legend.enabled || this.config.series.length <= 1) {
      this.legendLayer.style.display = 'none';
      return;
    }

    this.legendLayer.style.display = 'flex';

    this.config.series.forEach((series, index) => {
      const color =
        series.style?.color ?? this.config.theme.palette[index % this.config.theme.palette.length];
      const item = document.createElement('div');
      item.style.display = 'inline-flex';
      item.style.alignItems = 'center';
      item.style.gap = '6px';
      item.style.color = this.config.theme.textColor;

      const swatch = document.createElement('span');
      swatch.style.width = '10px';
      swatch.style.height = '10px';
      swatch.style.borderRadius = '999px';
      swatch.style.background = color;

      const text = document.createElement('span');
      text.textContent = series.label ?? series.id;

      item.appendChild(swatch);
      item.appendChild(text);
      this.legendLayer.appendChild(item);
    });
  }

  private bindTooltip(
    root: Selection<SVGGElement, unknown, null, undefined>,
    xScale: ScaleLinear<number, number, never>,
    yScale: ScaleLinear<number, number, never>,
    chartWidth: number,
    chartHeight: number,
  ): void {
    const overlay = root
      .append('rect')
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    overlay
      .on('mousemove', (event) => {
        const [mx, my] = pointer(event);
        const nearest = this.findNearestPoint(mx, my, xScale, yScale);
        if (!nearest) {
          this.tooltipLayer.style.display = 'none';
          return;
        }

        const left = this.config.layout.marginLeft + mx + 12;
        const top = this.config.layout.marginTop + my + 12;
        this.tooltipLayer.style.left = `${left}px`;
        this.tooltipLayer.style.top = `${top}px`;
        const seriesIndex = this.config.series.findIndex(
          (series) => series.id === nearest.series.id,
        );
        const seriesColor =
          nearest.series.style?.color ??
          this.config.theme.palette[seriesIndex % this.config.theme.palette.length] ??
          '#38bdf8';

        this.tooltipLayer.style.borderLeft = `3px solid ${seriesColor}`;
        this.tooltipLayer.textContent = `${nearest.series.label ?? nearest.series.id}: ${nearest.point.y.toFixed(3)}`;
        this.tooltipLayer.style.display = 'block';
      })
      .on('click', (event) => {
        const [mx, my] = pointer(event);
        const nearest = this.findNearestPoint(mx, my, xScale, yScale);
        if (!nearest) {
          this.tooltipLayer.style.display = 'none';
          return;
        }

        const left = this.config.layout.marginLeft + mx + 12;
        const top = this.config.layout.marginTop + my + 12;
        this.tooltipLayer.style.left = `${left}px`;
        this.tooltipLayer.style.top = `${top}px`;
        this.tooltipLayer.style.display = 'block';
      })
      .on('mouseleave', () => {
        if (window.matchMedia('(pointer: fine)').matches) {
          this.tooltipLayer.style.display = 'none';
        }
      });
  }

  private findNearestPoint(
    mouseX: number,
    mouseY: number,
    xScale: ScaleLinear<number, number, never>,
    yScale: ScaleLinear<number, number, never>,
  ): {
    series: PrettyPlotConfig['series'][number];
    point: { x: PrettyPlotXValue; y: number };
  } | null {
    let nearest: {
      series: PrettyPlotConfig['series'][number];
      point: { x: PrettyPlotXValue; y: number };
      distance: number;
    } | null = null;

    for (const series of this.config.series) {
      for (const point of series.points) {
        const pointX = xScale(point.x.valueOf());
        const pointY = yScale(point.y);
        const dx = pointX - mouseX;
        const dy = pointY - mouseY;
        const distance = dx * dx + dy * dy;
        if (!nearest || distance < nearest.distance) {
          nearest = { series, point, distance };
        }
      }
    }

    if (!nearest) {
      return null;
    }

    return {
      series: nearest.series,
      point: nearest.point,
    };
  }

  private buildExportNode(
    backgroundSpec: SharedExportBackgroundSpec,
    includeStaticBackground: boolean,
  ): HTMLDivElement {
    const width = this.config.layout.width ?? this.container.clientWidth;
    const height = this.config.layout.height ?? this.container.clientHeight;

    const node = document.createElement('div');
    node.style.position = 'fixed';
    node.style.left = '0';
    node.style.top = '0';
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
    node.style.pointerEvents = 'none';
    node.style.opacity = '0';
    node.style.zIndex = '-1';
    if (includeStaticBackground) {
      applySharedStaticBackground(node, width, height, backgroundSpec);
    } else {
      node.style.background = 'transparent';
    }

    const clone = this.container.cloneNode(true) as HTMLElement;
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.background = 'transparent';
    this.applyForegroundContrastForBackground(clone, backgroundSpec);
    node.appendChild(clone);

    return node;
  }

  private applyForegroundContrastForBackground(
    clone: HTMLElement,
    backgroundSpec: SharedExportBackgroundSpec,
  ): void {
    if (!this.shouldUseLightForegroundOverrides(backgroundSpec)) {
      return;
    }

    const svg = clone.querySelector('svg');
    if (svg) {
      svg.querySelectorAll<SVGTextElement>('text').forEach((node) => {
        node.setAttribute('fill', '#0f172a');
      });

      svg.querySelectorAll<SVGElement>('.domain').forEach((node) => {
        node.setAttribute('stroke', '#64748b');
        node.setAttribute('stroke-opacity', '0.78');
      });

      svg.querySelectorAll<SVGElement>('.tick line').forEach((node) => {
        node.setAttribute('stroke', '#64748b');
        node.setAttribute('stroke-opacity', '0.62');
      });

      svg.querySelectorAll<SVGElement>('.y-grid line').forEach((node) => {
        node.setAttribute('stroke', 'rgba(100, 116, 139, 0.3)');
      });
    }

    const legendCandidates = clone.querySelectorAll<HTMLDivElement>('div');
    legendCandidates.forEach((candidate) => {
      if (
        candidate.style.position === 'absolute' &&
        candidate.style.top === '8px' &&
        candidate.style.right === '8px' &&
        candidate.style.display === 'flex'
      ) {
        candidate.querySelectorAll<HTMLElement>('span').forEach((node) => {
          if (node.textContent?.trim()) {
            node.style.color = '#0f172a';
          }
        });
      }
    });
  }

  private shouldUseLightForegroundOverrides(backgroundSpec: SharedExportBackgroundSpec): boolean {
    if (backgroundSpec.id === 'app-starfield-light') {
      return true;
    }

    if (backgroundSpec.id !== 'solid-color') {
      return false;
    }

    const hex = backgroundSpec.color.replace('#', '').trim();
    if (hex.length !== 6) {
      return false;
    }

    const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
    const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
    const b = Number.parseInt(hex.slice(4, 6), 16) / 255;

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.58;
  }

  private async encodeGif(
    frames: Array<{
      rgba: Uint8Array | Uint8ClampedArray;
      width: number;
      height: number;
      delayMs?: number;
    }>,
    options: {
      repeat?: number;
      maxColors?: number;
      quantizeFormat?: 'rgb565' | 'rgb444';
      paletteSampleFrames?: number;
      paletteTargetPixelsPerFrame?: number;
      antiBanding?: boolean;
      antiBandingStrength?: number;
    },
  ): Promise<{ blob: Blob }> {
    const result = await encodeGifWithRuntimeWorker(frames, options);
    const bytes = new Uint8Array(result.bytes.length);
    bytes.set(result.bytes);
    return { blob: new Blob([bytes], { type: 'image/gif' }) };
  }
}
