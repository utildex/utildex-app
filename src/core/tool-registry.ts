
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
};

export function getToolComponent(id: string): (() => Promise<any>) | null {
  return TOOL_COMPONENT_MAP[id] || null;
}
