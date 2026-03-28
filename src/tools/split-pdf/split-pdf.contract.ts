import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { schema } from './split-pdf.schema';

export const contract: ToolContract = {
  id: 'split-pdf',
  metadata: {
    name: { en: 'Split PDF', fr: 'Diviser PDF', es: 'Dividir PDF', zh: '拆分 PDF' },
    description: {
      en: 'Extract specific pages from a PDF document. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Extrayez des pages specifiques dun document PDF. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Extraiga paginas especificas de un documento PDF. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '从 PDF 文档中提取特定页面。数据不会离开你的设备。完全离线运行；你可以断开网络。',
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
  schema,
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
