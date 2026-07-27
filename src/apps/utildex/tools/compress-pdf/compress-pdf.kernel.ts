import type { z } from 'zod';
import { schema } from './compress-pdf.schema';

export const mcpCompatible = false;

export type CompressionMode = 'standard' | 'image-optimize' | 'maximum';

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

function calculateRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round((1 - compressed / original) * 100);
}

/**
 * Standard compression: strip metadata and optimize object structure via pdf-lib.
 * Preserves text searchability. Best for text-heavy documents.
 * Does NOT recompress embedded images.
 */
export async function compressStandard(sourceBytes: ArrayBuffer): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');

  const doc = await PDFDocument.load(sourceBytes);

  // Strip metadata
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setCreator('');
  doc.setProducer('');
  doc.setKeywords([]);

  // Save → reload → save cycle to drop unreferenced objects
  const firstPass = await doc.save();
  const reloaded = await PDFDocument.load(firstPass);
  const finalBytes = await reloaded.save();

  return new Uint8Array(finalBytes);
}

/**
 * Image-optimize compression: rasterize each page to a JPEG at configurable
 * quality, then preserve text as an invisible searchable layer.
 *
 * Best for image-heavy PDFs — dramatically reduces file size by recompressing
 * embedded images while keeping text searchable.
 *
 * Uses pdfjs-dist for rendering + text extraction and pdf-lib for PDF assembly.
 */
export async function compressImageOptimize(
  sourceBytes: ArrayBuffer,
  jpegQuality: number,
): Promise<Uint8Array> {
  const pdfjsLib = await import('pdfjs-dist');

  const loadingTask = pdfjsLib.getDocument({ data: sourceBytes });
  const srcDoc = await loadingTask.promise;
  const numPages = srcDoc.numPages;

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const outDoc = await PDFDocument.create();

  // Embed a standard font for the invisible text layer
  const font = await outDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= numPages; i++) {
    const page = await srcDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    // --- Render page to JPEG ---
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    // White background (PDFs may have transparency)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', jpegQuality),
    );
    const jpegBuffer = await blob.arrayBuffer();

    // --- Embed JPEG as page background ---
    const embeddedImage = await outDoc.embedJpg(jpegBuffer);
    const dims = embeddedImage.scale(1);
    const pdfPage = outDoc.addPage([dims.width, dims.height]);
    pdfPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: dims.width,
      height: dims.height,
    });

    // --- Extract and overlay invisible text layer ---
    try {
      const textContent = await page.getTextContent();
      const scaleX = dims.width / viewport.width;
      const scaleY = dims.height / viewport.height;

      for (const item of textContent.items) {
        if (!('str' in item) || !item.str.trim()) continue;

        const tx = item.transform;
        // PDF transform matrix: [a, b, c, d, e, f]
        // e = translateX, f = translateY
        const x = tx[4] * scaleX;
        // In PDF coordinates, y is from bottom. Flip to top.
        const y = dims.height - tx[5] * scaleY;
        const fontSize = Math.abs(tx[3]) * scaleY;

        if (fontSize < 2) continue; // skip tiny text

        pdfPage.drawText(item.str, {
          x,
          y,
          size: fontSize,
          font,
          opacity: 0, // invisible but searchable/selectable
          color: rgb(0, 0, 0),
        });
      }
    } catch {
      // Text extraction can fail on some PDFs; degrade gracefully
    }
  }

  const bytes = await outDoc.save();
  return new Uint8Array(bytes);
}

/**
 * Maximum compression: rasterize each page to a JPEG image and rebuild the PDF.
 * Achieves the smallest file sizes but loses text selection and searchability.
 *
 * Uses pdfjs-dist for rendering and pdf-lib for PDF assembly.
 */
export async function compressMaximum(
  sourceBytes: ArrayBuffer,
  quality: number,
): Promise<Uint8Array> {
  const pdfjsLib = await import('pdfjs-dist');

  const loadingTask = pdfjsLib.getDocument({ data: sourceBytes });
  const srcDoc = await loadingTask.promise;
  const numPages = srcDoc.numPages;

  const { PDFDocument } = await import('pdf-lib');
  const outDoc = await PDFDocument.create();

  const jpegQuality = quality / 100;

  for (let i = 1; i <= numPages; i++) {
    const page = await srcDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', jpegQuality),
    );
    const jpegBuffer = await blob.arrayBuffer();

    const embeddedImage = await outDoc.embedJpg(jpegBuffer);
    const dims = embeddedImage.scale(1);

    const pdfPage = outDoc.addPage([dims.width, dims.height]);
    pdfPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: dims.width,
      height: dims.height,
    });
  }

  const bytes = await outDoc.save();
  return new Uint8Array(bytes);
}

export async function run(
  input: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const sourceBuffer = base64ToArrayBuffer(input.sourceBytes);
  const originalSize = sourceBuffer.byteLength;

  let compressedBytes: Uint8Array;

  if (input.mode === 'maximum') {
    compressedBytes = await compressMaximum(sourceBuffer, input.quality ?? 50);
  } else if (input.mode === 'image-optimize') {
    compressedBytes = await compressImageOptimize(sourceBuffer, (input.quality ?? 50) / 100);
  } else {
    compressedBytes = await compressStandard(sourceBuffer);
  }

  const compressedSize = compressedBytes.byteLength;

  return {
    bytes: bytesToBase64(compressedBytes),
    originalSize,
    compressedSize,
    ratio: calculateRatio(originalSize, compressedSize),
  };
}
