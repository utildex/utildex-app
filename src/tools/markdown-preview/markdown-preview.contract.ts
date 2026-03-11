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
      en: 'Live editor to write and preview Markdown formatted text instantly. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Editeur en direct pour ecrire et previsualiser instantanement du texte formate en Markdown. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Editor en vivo para escribir y previsualizar texto formateado en Markdown al instante. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '即时编写和预览 Markdown 格式文本。数据不会离开你的设备。完全离线运行；你可以断开网络。',
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
