import type { z } from 'zod';
import { schema } from './merge-pdf.schema';

export interface MergeInputFile {
  name: string;
  buffer: ArrayBuffer;
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

export async function mergePdfBuffers(files: MergeInputFile[]): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const mergedPdf = await PDFDocument.create();

  for (const pdf of files) {
    const doc = await PDFDocument.load(pdf.buffer);
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const bytes = await mergedPdf.save();
  return new Uint8Array(bytes);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function run(
  input: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const files: MergeInputFile[] = input.map((file) => ({
    ...file,
    buffer: base64ToArrayBuffer(file.buffer),
  }));

  const bytes = await mergePdfBuffers(files);
  return { bytes: bytesToBase64(bytes) };
}
