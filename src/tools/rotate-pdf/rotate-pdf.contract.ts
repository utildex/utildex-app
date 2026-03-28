import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { schema } from './rotate-pdf.schema';

export const contract: ToolContract = {
  id: 'rotate-pdf',
  metadata: {
    name: { en: 'Rotate PDF', fr: 'Pivoter PDF', es: 'Rotar PDF', zh: '旋转 PDF' },
    description: {
      en: 'Rotate all or selected pages of a PDF document permanently. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Faites pivoter toutes ou certaines pages dun document PDF de facon permanente. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Rote todas o las paginas seleccionadas de un documento PDF permanentemente. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '永久旋转 PDF 文档的所有或选定页面。数据不会离开你的设备。完全离线运行；你可以断开网络。',
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
  schema,
  widget: { supported: true, defaultCols: 2, defaultRows: 1 },
  cost: 'medium',
};
