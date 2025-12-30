
// This file maps Tool IDs (from metadata.json) to their Component Classes.
// This is necessary because 'metadata.json' does not store executable code references.
// We use lazy imports to ensure we don't bundle all tools into the main bundle.

export const TOOL_COMPONENT_MAP: Record<string, () => Promise<any>> = {
  'lorem-ipsum': () => import('../tools/lorem-ipsum/lorem-ipsum.component').then(m => m.LoremIpsumComponent),
  'password-generator': () => import('../tools/password-generator/password-generator.component').then(m => m.PasswordGeneratorComponent),
  'markdown-preview': () => import('../tools/markdown-preview/markdown-preview.component').then(m => m.MarkdownPreviewComponent),
  'json-formatter': () => import('../tools/json-formatter/json-formatter.component').then(m => m.JsonFormatterComponent),
  'unit-converter': () => import('../tools/unit-converter/unit-converter.component').then(m => m.UnitConverterComponent),
  'split-pdf': () => import('../tools/split-pdf/split-pdf.component').then(m => m.SplitPdfComponent),
  'merge-pdf': () => import('../tools/merge-pdf/merge-pdf.component').then(m => m.MergePdfComponent),
  'img-to-pdf': () => import('../tools/img-to-pdf/img-to-pdf.component').then(m => m.ImgToPdfComponent),
  'rotate-pdf': () => import('../tools/rotate-pdf/rotate-pdf.component').then(m => m.RotatePdfComponent),
  'pdf-to-img': () => import('../tools/pdf-to-img/pdf-to-img.component').then(m => m.PdfToImgComponent),
  'image-converter': () => import('../tools/image-converter/image-converter.component').then(m => m.ImageConverterComponent),
  'qr-studio': () => import('../tools/qr-studio/qr-studio.component').then(m => m.QrStudioComponent),
  'diff-checker': () => import('../tools/diff-checker/diff-checker.component').then(m => m.DiffCheckerComponent),
  'hash-generator': () => import('../tools/hash-generator/hash-generator.component').then(m => m.HashGeneratorComponent),
};

export function getToolComponent(id: string): (() => Promise<any>) | null {
  return TOOL_COMPONENT_MAP[id] || null;
}
