import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'diff-checker',
  metadata: {
    name: {
      en: 'Diff Checker',
      fr: 'Comparateur de Texte',
      es: 'Comparador de Texto',
      zh: '文本差异对比',
    },
    description: {
      en: 'Compare text or code to find differences. Runs locally for privacy.',
      fr: 'Comparez du texte ou du code pour trouver les differences. Fonctionne localement pour la confidentialite.',
      es: 'Compare texto o codigo para encontrar diferencias. Ejecucion local para privacidad.',
      zh: '对比文本或代码以查找差异。本地运行，保护隐私。',
    },
    icon: 'difference',
    version: '1.0.0',
    categories: ['Developer', 'Office'],
    tags: ['diff', 'compare', 'code', 'text', 'check'],
    color: '#6366f1',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  widget: {
    supported: true,
    defaultCols: 3,
    defaultRows: 1,
    presets: [
      { label: { en: 'Wide Compare', fr: 'Large', es: 'Ancho', zh: '宽屏对比' }, cols: 3, rows: 1 },
      {
        label: { en: 'Mini Editor', fr: 'Mini Editeur', es: 'Mini Editor', zh: '迷你编辑器' },
        cols: 2,
        rows: 2,
      },
    ],
  },
  cost: 'low',
};
