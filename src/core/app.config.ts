import { APP_CONFIG_DATA } from '../../app.config';

export interface ResolvePublicBaseUrlOptions {
  envBaseUrl?: string | undefined;
  runtimeOrigin?: string | undefined;
}

export const APP_CONFIG = APP_CONFIG_DATA;

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return APP_CONFIG.hosting.defaultPublicBaseUrl;
  return trimmed.replace(/\/+$/, '');
}

export function resolvePublicBaseUrl(options: ResolvePublicBaseUrlOptions = {}): string {
  const fromEnv = options.envBaseUrl?.trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);

  const fromRuntime = options.runtimeOrigin?.trim();
  if (fromRuntime) return normalizeBaseUrl(fromRuntime);

  return APP_CONFIG.hosting.defaultPublicBaseUrl;
}

export function toAbsoluteUrl(baseUrl: string, value: string): string {
  if (!value) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  const cleaned = value.replace(/^\.\//, '/').replace(/^\.\.\//, '/');
  if (cleaned.startsWith('/')) return `${baseUrl}${cleaned}`;
  return `${baseUrl}/${cleaned}`;
}
