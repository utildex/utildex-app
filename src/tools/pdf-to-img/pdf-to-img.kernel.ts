import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

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
