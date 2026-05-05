import type { z } from 'zod';
import { schema } from './img-to-pdf.schema';

/**
 * Images-to-PDF Kernel — pure transformation logic.
 *
 * No Angular imports. No UI dependencies. No registry access.
 * Callable as a pure function for pipeline orchestration.
 */

export type PageSizeMode = 'fit' | 'a4' | 'letter';

export interface ImageInput {
  buffer: ArrayBuffer;
  mimeType: string;
  name: string;
}

export interface ConvertResult {
  success: boolean;
  pdfBytes: Uint8Array | null;
  error: string | null;
}

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

/**
 * Convert an array of image buffers into a single PDF document.
 *
 * Dynamically imports pdf-lib for tree-shaking.
 */
export async function convertImagesToPdf(
  images: ImageInput[],
  pageSize: PageSizeMode = 'a4',
): Promise<ConvertResult> {
  if (images.length === 0) {
    return { success: false, pdfBytes: null, error: 'No images provided' };
  }

  try {
    const { PDFDocument, PageSizes } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();

    for (const img of images) {
      let embeddedImage;

      if (img.mimeType === 'image/jpeg') {
        embeddedImage = await pdfDoc.embedJpg(img.buffer);
      } else if (img.mimeType === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(img.buffer);
      } else {
        try {
          embeddedImage = await pdfDoc.embedPng(img.buffer);
        } catch {
          console.warn('Skipping unsupported image', img.name);
          continue;
        }
      }

      const imgDims = embeddedImage.scale(1);

      let pageWidth: number;
      let pageHeight: number;

      if (pageSize === 'fit') {
        pageWidth = imgDims.width;
        pageHeight = imgDims.height;
      } else if (pageSize === 'a4') {
        [pageWidth, pageHeight] = PageSizes.A4;
      } else {
        [pageWidth, pageHeight] = PageSizes.Letter;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      if (pageSize === 'fit') {
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: imgDims.width,
          height: imgDims.height,
        });
      } else {
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        const scale = Math.min(maxWidth / imgDims.width, maxHeight / imgDims.height);
        const w = imgDims.width * scale;
        const h = imgDims.height * scale;

        page.drawImage(embeddedImage, {
          x: (pageWidth - w) / 2,
          y: (pageHeight - h) / 2,
          width: w,
          height: h,
        });
      }
    }

    const bytes = await pdfDoc.save();
    return { success: true, pdfBytes: new Uint8Array(bytes), error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Conversion failed';
    return { success: false, pdfBytes: null, error: message };
  }
}

/**
 * Pipeline entry point — convert image buffers to PDF with default settings.
 */
export async function run(
  input: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const images: ImageInput[] = input.map((image) => ({
    ...image,
    buffer: base64ToArrayBuffer(image.buffer),
  }));

  const result = await convertImagesToPdf(images, 'a4');
  return {
    success: result.success,
    pdfBytes: result.pdfBytes ? bytesToBase64(result.pdfBytes) : null,
    error: result.error,
  };
}
