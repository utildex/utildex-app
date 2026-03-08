import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'split-pdf',
  metadata: {
    name: { en: 'Split PDF', fr: 'Diviser PDF', es: 'Dividir PDF', zh: '拆分 PDF' },
    description: {
      en: 'Extract specific pages from a PDF document. Processed 100% locally.',
      fr: 'Extrayez des pages specifiques dun document PDF. Traite 100% localement.',
      es: 'Extraiga paginas especificas de un documento PDF. Procesado 100% localmente.',
      zh: '从 PDF 文档中提取特定页面。100% 本地处理。',
    },
    icon: 'picture_as_pdf',
    version: '1.0.0',
    categories: ['Office', 'Utility'],
    tags: ['pdf', 'split', 'extract', 'pages', 'document'],
    color: '#ef4444',
  },
  types: {
    input: { traits: [TRAITS.document] },
    output: { format: 'pdf' },
  },
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: { en: 'Icon', fr: 'Icone', es: 'Icono', zh: '图标' }, cols: 1, rows: 1 },
      { label: { en: 'Wide', fr: 'Large', es: 'Ancho', zh: '宽' }, cols: 2, rows: 1 },
      { label: { en: 'Tall', fr: 'Haut', es: 'Alto', zh: '高' }, cols: 1, rows: 2 },
      { label: { en: 'Large', fr: 'Grand', es: 'Grande', zh: '大' }, cols: 2, rows: 2 },
    ],
  },
  cost: 'high',
};
