export type QrType = 'url' | 'text' | 'wifi';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrConfig {
  errorCorrectionLevel: ErrorCorrectionLevel;
  foreground: string;
  background: string;
  width: number;
}

export interface WifiPayload {
  ssid: string;
  password: string;
  hidden: boolean;
}

function escapeWifi(str: string): string {
  return str.replace(/([\\;,:])/g, '\\$1');
}

export function buildQrContent(
  type: QrType,
  data: { url?: string; text?: string; wifi?: WifiPayload },
): string {
  switch (type) {
    case 'url':
      return data.url ?? '';
    case 'text':
      return data.text ?? '';
    case 'wifi': {
      if (!data.wifi) return '';
      const ssid = escapeWifi(data.wifi.ssid);
      const pass = escapeWifi(data.wifi.password);
      const auth = pass ? 'WPA' : 'nopass';
      const hidden = data.wifi.hidden ? 'true' : 'false';
      return `WIFI:S:${ssid};T:${auth};P:${pass};H:${hidden};;`;
    }
  }
}

export async function generateQrCode(content: string, config: QrConfig): Promise<string> {
  if (!content) return '';

  const { toDataURL } = await import('qrcode');

  return toDataURL(content, {
    errorCorrectionLevel: config.errorCorrectionLevel,
    margin: 1,
    color: {
      dark: config.foreground,
      light: config.background,
    },
    width: config.width,
  });
}

/** Pipeline-friendly variant that returns a Blob instead of a dataUrl. */
export async function generateQrBlob(content: string, config: QrConfig): Promise<Blob> {
  const dataUrl = await generateQrCode(content, config);
  if (!dataUrl) return new Blob([], { type: 'image/png' });
  const res = await fetch(dataUrl);
  return res.blob();
}
