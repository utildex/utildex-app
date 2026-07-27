import type { z } from 'zod';
import { schema, type FormatId } from './uniformize-pdf.schema';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export interface FormatInfo {
  id: FormatId;
  width: number;
  height: number;
}

export const FORMATS: Record<FormatId, FormatInfo> = {
  a4: { id: 'a4', width: 595.28, height: 841.89 },
  a3: { id: 'a3', width: 841.89, height: 1190.55 },
  letter: { id: 'letter', width: 612, height: 792 },
  legal: { id: 'legal', width: 612, height: 1008 },
  tabloid: { id: 'tabloid', width: 792, height: 1224 },
};

/**
 * Uniformize all pages in a PDF to a single target format.
 *
 * For each page:
 * 1. Calculate scale to fit content within target while preserving aspect ratio
 * 2. Center the scaled content on the new page
 * 3. Draw a white background behind content
 *
 * Uses pdf-lib's embedPage/drawPage for clean page resizing.
 */
export async function uniformizePages(
  sourceBytes: ArrayBuffer,
  formatId: FormatId,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const { PDFDocument, rgb } = await import('pdf-lib');

  const sourceDoc = await PDFDocument.load(sourceBytes);
  const sourcePages = sourceDoc.getPages();
  const pageCount = sourcePages.length;

  const target = FORMATS[formatId];
  const targetW = target.width;
  const targetH = target.height;

  const outDoc = await PDFDocument.create();

  for (const sourcePage of sourcePages) {
    const { width: srcW, height: srcH } = sourcePage.getSize();

    // Scale to fit within target, maintaining aspect ratio
    const scale = Math.min(targetW / srcW, targetH / srcH);
    const scaledW = srcW * scale;
    const scaledH = srcH * scale;

    // Center on the new page
    const x = (targetW - scaledW) / 2;
    const y = (targetH - scaledH) / 2;

    // Embed the source page
    const embeddedPage = await outDoc.embedPage(sourcePage);

    // Create a new page at target dimensions
    const newPage = outDoc.addPage([targetW, targetH]);

    // White background (in case source has transparent areas)
    newPage.drawRectangle({
      x: 0,
      y: 0,
      width: targetW,
      height: targetH,
      color: rgb(1, 1, 1),
    });

    // Draw the original page scaled and centered
    newPage.drawPage(embeddedPage, {
      x,
      y,
      width: scaledW,
      height: scaledH,
    });
  }

  const bytes = await outDoc.save();
  return { bytes: new Uint8Array(bytes), pageCount };
}

export async function run(
  input: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const sourceBuffer = base64ToArrayBuffer(input.sourceBytes);
  const result = await uniformizePages(sourceBuffer, input.format ?? 'a4');

  return {
    bytes: bytesToBase64(result.bytes),
    pageCount: result.pageCount,
  };
}
