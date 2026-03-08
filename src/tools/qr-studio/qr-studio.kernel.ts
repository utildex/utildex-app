/**
 * QR Studio Kernel — pure transformation logic.
 *
 * No Angular imports. No UI dependencies. No registry access.
 * Callable as a pure function for pipeline orchestration.
 */

export type QrType = 'url' | 'text' | 'wifi';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrInput {
  type: QrType;
  url?: string;
  text?: string;
  wifiSsid?: string;
  wifiPass?: string;
  wifiHidden?: boolean;
  colorDark?: string;
  colorLight?: string;
  errorLevel?: ErrorCorrectionLevel;
}

export interface QrResult {
  success: boolean;
  dataUrl: string;
  error: string | null;
}

/**
 * Escape special characters in WiFi SSID/password per WiFi QR spec.
 */
export function escapeWifi(str: string): string {
  return str.replace(/([\\;,:])/g, '\\$1');
}

/**
 * Build the content string for a QR code based on input type.
 */
export function buildQrContent(input: QrInput): string {
  switch (input.type) {
    case 'url':
      return input.url ?? '';
    case 'text':
      return input.text ?? '';
    case 'wifi': {
      const ssid = escapeWifi(input.wifiSsid ?? '');
      const pass = escapeWifi(input.wifiPass ?? '');
      const authType = pass ? 'WPA' : 'nopass';
      const hidden = input.wifiHidden ? 'true' : 'false';
      return `WIFI:S:${ssid};T:${authType};P:${pass};H:${hidden};;`;
    }
    default:
      return '';
  }
}

/**
 * Generate a QR code data URL.
 * Requires the `qrcode` library to be loaded on the window object.
 *
 * This is async because the underlying library is async.
 */
export async function generateQr(
  input: QrInput,
  qrCodeLib: { toDataURL: (content: string, options: Record<string, unknown>) => Promise<string> },
): Promise<QrResult> {
  const content = buildQrContent(input);
  if (!content) {
    return { success: false, dataUrl: '', error: 'No content provided' };
  }

  try {
    const dataUrl = await qrCodeLib.toDataURL(content, {
      errorCorrectionLevel: input.errorLevel ?? 'M',
      margin: 1,
      color: {
        dark: input.colorDark ?? '#000000',
        light: input.colorLight ?? '#ffffff',
      },
      width: 1024,
    });
    return { success: true, dataUrl, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'QR generation failed';
    return { success: false, dataUrl: '', error: message };
  }
}

/**
 * Pipeline entry point — generate QR from text with defaults.
 */
export async function run(
  input: string,
  qrCodeLib: { toDataURL: (content: string, options: Record<string, unknown>) => Promise<string> },
): Promise<QrResult> {
  return generateQr({ type: 'text', text: input }, qrCodeLib);
}
