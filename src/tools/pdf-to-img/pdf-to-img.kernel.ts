import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { z } from 'zod';
import { schema } from './pdf-to-img.schema';

export const mcpCompatible = false;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Blob conversion failed'));
        return;
      }

      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Blob conversion failed'));
    reader.readAsDataURL(blob);
  });
}

export interface PageThumbnail {
  pageNumber: number;
  dataUrl: string;
  selected: boolean;
  viewport: ReturnType<PDFPageProxy['getViewport']>;
}

export async function renderThumbnails(doc: PDFDocumentProxy): Promise<PageThumbnail[]> {
  const thumbnails: PageThumbnail[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvas, canvasContext: context!, viewport }).promise;
    thumbnails.push({
      pageNumber: i,
      dataUrl: canvas.toDataURL('image/jpeg', 0.8),
      selected: true,
      viewport: page.getViewport({ scale: 1 }),
    });
  }
  return thumbnails;
}

export async function loadPdf(fileBytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
  return loadingTask.promise;
}

export async function renderPageToBlob(
  doc: PDFDocumentProxy,
  pageNumber: number,
  format: 'png' | 'jpeg' | 'webp',
  scale: number,
): Promise<Blob | null> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvas, canvasContext: context!, viewport }).promise;

  const mime = `image/${format}`;
  return new Promise((resolve) => canvas.toBlob(resolve, mime, 0.9));
}

export async function run(
  input: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  try {
    const doc = await loadPdf(base64ToArrayBuffer(input.pdfBytes));
    const pageNumbers =
      input.pageNumbers && input.pageNumbers.length > 0
        ? input.pageNumbers
        : Array.from({ length: doc.numPages }, (_, index) => index + 1);

    const images: z.infer<typeof schema.output>['images'] = [];
    for (const pageNumber of pageNumbers) {
      const blob = await renderPageToBlob(doc, pageNumber, input.format, input.scale ?? 2);
      if (!blob) {
        continue;
      }

      images.push({
        pageNumber,
        bytes: await blobToBase64(blob),
      });
    }

    return { images, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF conversion failed';
    return { images: [], error: message };
  }
}
