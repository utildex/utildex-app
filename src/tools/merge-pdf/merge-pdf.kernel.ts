export interface MergeInputFile {
  name: string;
  buffer: ArrayBuffer;
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

export async function run(files: MergeInputFile[]): Promise<{ bytes: Uint8Array }> {
  return { bytes: await mergePdfBuffers(files) };
}
