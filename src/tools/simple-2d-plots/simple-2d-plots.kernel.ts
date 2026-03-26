import type {
  PrettyPlotSharedXInput,
  PrettyPlotSingleSeriesInput,
  PrettyPlotSeriesStyle,
} from '../../core/plotting/pretty';

export type Simple2dPresetId = 'single' | 'multi' | 'styled';

export interface ParseResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export function defaultPresetData(preset: Simple2dPresetId): string {
  if (preset === 'single') {
    return JSON.stringify(
      [
        [0, 1.2],
        [1, 1.8],
        [2, 2.9],
        [3, 2.2],
        [4, 3.8],
        [5, 3.2],
      ],
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      x: [0, 1, 2, 3, 4, 5],
      series: [
        { id: 'alpha', label: 'Alpha', y: [1.1, 1.6, 2.4, 2.1, 3.2, 2.9] },
        { id: 'beta', label: 'Beta', y: [0.8, 1.3, 1.7, 2.3, 2.7, 3.4] },
      ],
    },
    null,
    2,
  );
}

export function defaultStyleMapData(): string {
  return JSON.stringify(
    {
      alpha: { color: '#38bdf8', strokeWidth: 2.8 },
      beta: { color: '#f59e0b', strokeWidth: 2.2, strokeDasharray: '7 4' },
    },
    null,
    2,
  );
}

export function parseSinglePresetInput(raw: string): ParseResult<PrettyPlotSingleSeriesInput> {
  const parsed = parseJson(raw);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const value = parsed.value;
  if (Array.isArray(value)) {
    const points = normalizePointsArray(value);
    if (!points.ok) {
      return { ok: false, error: points.error };
    }
    const normalizedPoints = points.value ?? [];

    return {
      ok: true,
      value: {
        id: 'series-1',
        label: 'Series 1',
        data: normalizedPoints,
      },
    };
  }

  if (isRecord(value) && Array.isArray(value.data)) {
    const points = normalizePointsArray(value.data);
    if (!points.ok) {
      return { ok: false, error: points.error };
    }
    const normalizedPoints = points.value ?? [];

    return {
      ok: true,
      value: {
        id: toOptionalString(value.id) ?? 'series-1',
        label: toOptionalString(value.label) ?? 'Series 1',
        data: normalizedPoints,
      },
    };
  }

  return {
    ok: false,
    error:
      'Single preset expects either an array like [[x,y], ...] or an object { id, label, data: [[x,y], ...] }.',
  };
}

export function parseMultiPresetInput(raw: string): ParseResult<PrettyPlotSharedXInput> {
  const parsed = parseJson(raw);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const value = parsed.value;
  if (!isRecord(value) || !Array.isArray(value.x) || !Array.isArray(value.series)) {
    return {
      ok: false,
      error:
        'Multi and Styled presets expect an object: { x: number[], series: [{ id, label?, y: number[] }] }.',
    };
  }

  const x = value.x.map((entry) => Number(entry));
  if (x.some((entry) => !Number.isFinite(entry))) {
    return { ok: false, error: 'All x values must be finite numbers.' };
  }

  const series = value.series
    .map((entry) => {
      if (!isRecord(entry) || !Array.isArray(entry.y)) {
        return null;
      }

      const id = toOptionalString(entry.id);
      if (!id) {
        return null;
      }

      const y = entry.y.map((n) => Number(n));
      if (y.some((n) => !Number.isFinite(n))) {
        return null;
      }

      return {
        id,
        label: toOptionalString(entry.label) ?? id,
        y,
      };
    })
    .filter((entry): entry is { id: string; label: string; y: number[] } => Boolean(entry));

  if (series.length === 0) {
    return {
      ok: false,
      error: 'At least one valid series is required: { id, y: number[] }.',
    };
  }

  return {
    ok: true,
    value: {
      x,
      series,
    },
  };
}

export function parseStyleMap(raw: string): ParseResult<Record<string, PrettyPlotSeriesStyle>> {
  const parsed = parseJson(raw);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const value = parsed.value;
  if (!isRecord(value)) {
    return { ok: false, error: 'Style map must be an object keyed by series id.' };
  }

  const output: Record<string, PrettyPlotSeriesStyle> = {};
  for (const [seriesId, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue;
    }

    const style: PrettyPlotSeriesStyle = {};

    const color = toOptionalString(entry.color);
    if (color) {
      style.color = color;
    }

    const strokeWidth = Number(entry.strokeWidth);
    if (Number.isFinite(strokeWidth)) {
      style.strokeWidth = strokeWidth;
    }

    const strokeDasharray = toOptionalString(entry.strokeDasharray);
    if (strokeDasharray) {
      style.strokeDasharray = strokeDasharray;
    }

    output[seriesId] = style;
  }

  return { ok: true, value: output };
}

function parseJson(raw: string): ParseResult<unknown> {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON.';
    return { ok: false, error: message };
  }
}

function normalizePointsArray(input: unknown[]): ParseResult<Array<[number, number]>> {
  const points: Array<[number, number]> = [];

  for (const entry of input) {
    if (Array.isArray(entry) && entry.length >= 2) {
      const x = Number(entry[0]);
      const y = Number(entry[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return { ok: false, error: 'Point arrays must contain finite numbers: [x, y].' };
      }
      points.push([x, y]);
      continue;
    }

    if (isRecord(entry)) {
      const x = Number(entry.x);
      const y = Number(entry.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return { ok: false, error: 'Point objects must contain finite numbers: { x, y }.' };
      }
      points.push([x, y]);
      continue;
    }

    return {
      ok: false,
      error: 'Points must be either [x, y] arrays or { x, y } objects.',
    };
  }

  if (points.length === 0) {
    return { ok: false, error: 'At least one point is required.' };
  }

  return { ok: true, value: points };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
