export interface JwtDecodeOptions {
  pretty: boolean;
  now?: number;
}

export type JwtTemporalStatus = 'valid' | 'expired' | 'not-yet-valid' | 'unbounded' | 'invalid';

export type JwtDecodeErrorCode =
  | 'INVALID_FORMAT'
  | 'HEADER_DECODE_FAILED'
  | 'PAYLOAD_DECODE_FAILED'
  | 'HEADER_JSON_INVALID'
  | 'PAYLOAD_JSON_INVALID';

export interface JwtDecodeResult {
  token: string;
  headerSegment: string;
  payloadSegment: string;
  signatureSegment: string;
  headerText: string;
  payloadText: string;
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  algorithm: string | null;
  tokenType: string | null;
  issuedAt: number | null;
  notBefore: number | null;
  expiresAt: number | null;
  temporalStatus: JwtTemporalStatus;
  error: JwtDecodeErrorCode | null;
}

function normalizeToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice(7).trim() : trimmed;
}

function normalizeBase64Url(value: string): string {
  const base = value.replace(/-/g, '+').replace(/_/g, '/');
  const mod = base.length % 4;
  if (mod === 0) return base;
  return base + '='.repeat(4 - mod);
}

function decodeBase64UrlUtf8(segment: string): string {
  const normalized = normalizeBase64Url(segment);
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function asNumericTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Math.floor(Number(value));
  }
  return null;
}

function formatJson(value: Record<string, unknown>, pretty: boolean): string {
  return JSON.stringify(value, null, pretty ? 2 : 0);
}

function buildBaseResult(token: string): JwtDecodeResult {
  return {
    token,
    headerSegment: '',
    payloadSegment: '',
    signatureSegment: '',
    headerText: '',
    payloadText: '',
    header: null,
    payload: null,
    algorithm: null,
    tokenType: null,
    issuedAt: null,
    notBefore: null,
    expiresAt: null,
    temporalStatus: 'invalid',
    error: null,
  };
}

function resolveTemporalStatus(
  payload: Record<string, unknown> | null,
  nowSeconds: number,
): JwtTemporalStatus {
  if (!payload) return 'invalid';

  const exp = asNumericTimestamp(payload['exp']);
  const nbf = asNumericTimestamp(payload['nbf']);

  if (exp !== null && nowSeconds >= exp) return 'expired';
  if (nbf !== null && nowSeconds < nbf) return 'not-yet-valid';
  if (exp !== null || nbf !== null) return 'valid';
  return 'unbounded';
}

export function decodeJwt(tokenInput: string, options: JwtDecodeOptions): JwtDecodeResult {
  const token = normalizeToken(tokenInput);
  const result = buildBaseResult(token);

  if (!token) {
    result.temporalStatus = 'unbounded';
    return result;
  }

  const segments = token.split('.');
  if (segments.length !== 3 || segments.some((s) => !s)) {
    result.error = 'INVALID_FORMAT';
    return result;
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  result.headerSegment = headerSegment;
  result.payloadSegment = payloadSegment;
  result.signatureSegment = signatureSegment;

  try {
    result.headerText = decodeBase64UrlUtf8(headerSegment);
  } catch {
    result.error = 'HEADER_DECODE_FAILED';
    return result;
  }

  try {
    result.payloadText = decodeBase64UrlUtf8(payloadSegment);
  } catch {
    result.error = 'PAYLOAD_DECODE_FAILED';
    return result;
  }

  try {
    const parsedHeader = JSON.parse(result.headerText) as Record<string, unknown>;
    result.header = parsedHeader;
    result.headerText = formatJson(parsedHeader, options.pretty);
    result.algorithm = typeof parsedHeader['alg'] === 'string' ? parsedHeader['alg'] : null;
    result.tokenType = typeof parsedHeader['typ'] === 'string' ? parsedHeader['typ'] : null;
  } catch {
    result.error = 'HEADER_JSON_INVALID';
    return result;
  }

  try {
    const parsedPayload = JSON.parse(result.payloadText) as Record<string, unknown>;
    result.payload = parsedPayload;
    result.payloadText = formatJson(parsedPayload, options.pretty);
    result.issuedAt = asNumericTimestamp(parsedPayload['iat']);
    result.notBefore = asNumericTimestamp(parsedPayload['nbf']);
    result.expiresAt = asNumericTimestamp(parsedPayload['exp']);
  } catch {
    result.error = 'PAYLOAD_JSON_INVALID';
    return result;
  }

  const nowMs = options.now ?? Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);
  result.temporalStatus = resolveTemporalStatus(result.payload, nowSeconds);

  return result;
}

export function run(input: { token: string; pretty?: boolean }): JwtDecodeResult {
  return decodeJwt(input.token, { pretty: input.pretty ?? true });
}
