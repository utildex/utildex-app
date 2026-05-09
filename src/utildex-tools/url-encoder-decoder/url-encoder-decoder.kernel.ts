import type { z } from 'zod';
import { schema } from './url-encoder-decoder.schema';

export type UrlMode = 'encode' | 'decode';

export interface UrlTransformOptions {
  plusForSpace: boolean;
}

export interface UrlTransformResult {
  value: string;
  error: string | null;
}

function encodeUrl(input: string, options: UrlTransformOptions): UrlTransformResult {
  try {
    const encoded = encodeURIComponent(input);
    const value = options.plusForSpace ? encoded.replace(/%20/g, '+') : encoded;
    return { value, error: null };
  } catch {
    return { value: '', error: 'ENCODE_FAILED' };
  }
}

function decodeUrl(input: string, options: UrlTransformOptions): UrlTransformResult {
  if (!input.trim()) {
    return { value: '', error: null };
  }

  try {
    const normalized = options.plusForSpace ? input.replace(/\+/g, '%20') : input;
    return { value: decodeURIComponent(normalized), error: null };
  } catch {
    return { value: '', error: 'DECODE_FAILED' };
  }
}

export function transformUrl(
  mode: UrlMode,
  input: string,
  options: UrlTransformOptions,
): UrlTransformResult {
  return mode === 'encode' ? encodeUrl(input, options) : decodeUrl(input, options);
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  return transformUrl(input.mode, input.input, { plusForSpace: input.plusForSpace ?? false });
}
