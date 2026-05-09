import type { z } from 'zod';
import { schema } from './split-pdf.schema';

export interface SplitResultFile {
  name: string;
  bytes: Uint8Array;
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

export function parsePageRange(range: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = range.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map((n) => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        const low = Math.max(1, Math.min(start, end));
        const high = Math.min(maxPages, Math.max(start, end));
        for (let i = low; i <= high; i++) pages.add(i - 1);
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) pages.add(num - 1);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export async function splitPdfByGroups(
  sourceBytes: ArrayBuffer,
  groups: string[],
  pageCount: number,
  baseName: string,
): Promise<SplitResultFile[]> {
  const { PDFDocument } = await import('pdf-lib');
  const source = await PDFDocument.load(sourceBytes);
  const results: SplitResultFile[] = [];

  for (let i = 0; i < groups.length; i++) {
    const indices = parsePageRange(groups[i], pageCount);
    if (indices.length === 0) continue;

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(source, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    const pdfBytes = await newPdf.save();

    const suffix = groups.length === 1 ? 'split' : `part-${i + 1}`;
    results.push({
      name: `${baseName}-${suffix}.pdf`,
      bytes: new Uint8Array(pdfBytes),
    });
  }

  return results;
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
  const files = await splitPdfByGroups(
    base64ToArrayBuffer(input.sourceBytes),
    input.groups,
    input.pageCount,
    input.baseName,
  );

  return {
    files: files.map((file) => ({
      name: file.name,
      bytes: bytesToBase64(file.bytes),
    })),
  };
}
