import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'markdown-preview',
  metadata: {
    name: {
      en: 'Markdown Preview',
      fr: 'Apercu Markdown',
      es: 'Vista previa Markdown',
      zh: 'Markdown 预览',
    },
    description: {
      en: 'Live editor to write and preview Markdown formatted text instantly.',
      fr: 'Editeur en direct pour ecrire et previsualiser instantanement du texte formate en Markdown.',
      es: 'Editor en vivo para escribir y previsualizar texto formateado en Markdown al instante.',
      zh: '即时编写和预览 Markdown 格式文本的实时编辑器。',
    },
    icon: 'markdown',
    version: '1.0.0',
    categories: ['Developer'],
    tags: ['developer', 'markdown', 'editor', 'preview'],
    featured: true,
    color: '#f59e0b',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  widget: { supported: true, defaultCols: 2, defaultRows: 2 },
  cost: 'low',
};
