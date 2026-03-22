export type Base64Mode = 'encode' | 'decode';

export interface Base64TransformOptions {
  urlSafe: boolean;
}

export interface Base64TransformResult {
  value: string;
  error: string | null;
}

function ensurePadding(value: string): string {
  const mod = value.length % 4;
  if (mod === 0) return value;
  return value + '='.repeat(4 - mod);
}

function toBase64FromUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function fromBase64ToUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(input: string, options: Base64TransformOptions): Base64TransformResult {
  try {
    const encoded = toBase64FromUtf8(input);
    const value = options.urlSafe
      ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      : encoded;
    return { value, error: null };
  } catch {
    return { value: '', error: 'ENCODE_FAILED' };
  }
}

function decodeBase64(input: string, options: Base64TransformOptions): Base64TransformResult {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return { value: '', error: null };
  }

  try {
    const standard = options.urlSafe
      ? normalizedInput.replace(/-/g, '+').replace(/_/g, '/')
      : normalizedInput;
    const padded = ensurePadding(standard);
    const value = fromBase64ToUtf8(padded);
    return { value, error: null };
  } catch {
    return { value: '', error: 'DECODE_FAILED' };
  }
}

export function transformBase64(
  mode: Base64Mode,
  input: string,
  options: Base64TransformOptions,
): Base64TransformResult {
  return mode === 'encode' ? encodeBase64(input, options) : decodeBase64(input, options);
}
