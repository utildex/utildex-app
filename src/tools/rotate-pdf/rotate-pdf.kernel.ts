export type RotationMode = 'all' | 'odd' | 'even' | 'specific';

export function parseRange(rangeStr: string, max: number): number[] {
  const pages = new Set<number>();
  if (!rangeStr) return [];

  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map((n) => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        const low = Math.max(1, Math.min(start, end));
        const high = Math.min(max, Math.max(start, end));
        for (let i = low; i <= high; i++) pages.add(i - 1);
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= max) pages.add(num - 1);
    }
  }

  return Array.from(pages);
}

export async function rotatePdfBytes(
  sourceBytes: ArrayBuffer,
  angle: number,
  mode: RotationMode,
  specificRange: string,
): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await import('pdf-lib');
  const doc = await PDFDocument.load(sourceBytes);
  const pages = doc.getPages();
  const pageCount = doc.getPageCount();

  const indicesToRotate = new Set<number>();

  if (mode === 'all') {
    for (let i = 0; i < pageCount; i++) indicesToRotate.add(i);
  } else if (mode === 'odd') {
    for (let i = 0; i < pageCount; i += 2) indicesToRotate.add(i);
  } else if (mode === 'even') {
    for (let i = 1; i < pageCount; i += 2) indicesToRotate.add(i);
  } else {
    parseRange(specificRange, pageCount).forEach((i) => indicesToRotate.add(i));
  }

  pages.forEach((page, idx) => {
    if (indicesToRotate.has(idx)) {
      const current = page.getRotation().angle;
      page.setRotation(degrees(current + angle));
    }
  });

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}

export async function run(input: {
  sourceBytes: ArrayBuffer;
  angle: number;
  mode: RotationMode;
  specificRange: string;
}): Promise<{ bytes: Uint8Array }> {
  return {
    bytes: await rotatePdfBytes(input.sourceBytes, input.angle, input.mode, input.specificRange),
  };
}
