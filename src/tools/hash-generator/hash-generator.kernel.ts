export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export function normalizeHash(raw: string, uppercase: boolean): string {
  if (!raw) return '';
  return uppercase ? raw.toUpperCase() : raw.toLowerCase();
}

export function compareHashes(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function run(input: { rawHash: string; uppercase: boolean }): { hash: string } {
  return { hash: normalizeHash(input.rawHash, input.uppercase) };
}
