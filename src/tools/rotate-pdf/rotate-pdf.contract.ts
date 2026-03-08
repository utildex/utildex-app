import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'rotate-pdf',
  metadata: {
    name: { en: 'Rotate PDF', fr: 'Pivoter PDF', es: 'Rotar PDF', zh: '旋转 PDF' },
    description: {
      en: 'Rotate all or selected pages of a PDF document permanently.',
      fr: 'Faites pivoter toutes ou certaines pages dun document PDF de facon permanente.',
      es: 'Rote todas o las paginas seleccionadas de un documento PDF permanentemente.',
      zh: '永久旋转 PDF 文档的所有或选定页面。',
    },
    icon: 'rotate_right',
    version: '1.0.0',
    categories: ['Office', 'Utility'],
    tags: ['pdf', 'rotate', 'turn', 'orientation', 'document'],
    color: '#f59e0b',
  },
  types: {
    input: { traits: [TRAITS.document] },
    output: { format: 'pdf' },
  },
  widget: { supported: true, defaultCols: 2, defaultRows: 1 },
  cost: 'medium',
};
