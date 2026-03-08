import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'merge-pdf',
  metadata: {
    name: { en: 'Merge PDF', fr: 'Fusionner PDF', es: 'Unir PDF', zh: '合并 PDF' },
    description: {
      en: 'Combine multiple PDF files into a single document. Reorder easily.',
      fr: 'Combinez plusieurs fichiers PDF en un seul document. Reorganisez facilement.',
      es: 'Combine multiples archivos PDF en un solo documento. Reordene facilmente.',
      zh: '将多个 PDF 文件合并为一个文档。轻松重新排序。',
    },
    icon: 'join_full',
    version: '1.0.0',
    categories: ['Office', 'Utility'],
    tags: ['pdf', 'merge', 'combine', 'join', 'document'],
    color: '#8b5cf6',
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
