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
      en: 'Compare text or code to find differences. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Comparez du texte ou du code pour trouver les differences. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Compare texto o codigo para encontrar diferencias. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '对比文本或代码以查找差异。数据不会离开你的设备。完全离线运行；你可以断开网络。',
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
