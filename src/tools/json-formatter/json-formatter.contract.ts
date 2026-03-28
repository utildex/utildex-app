import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { schema } from './json-formatter.schema';

export const contract: ToolContract = {
  id: 'json-formatter',

  metadata: {
    name: {
      en: 'JSON Formatter',
      fr: 'Formateur JSON',
      es: 'Formateador JSON',
      zh: 'JSON 格式化',
    },
    description: {
      en: 'Validate, format, and minify JSON data. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Validez, formatez et minifiez les donnees JSON. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Valida, formatea y minimiza datos JSON. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '验证、格式化和压缩 JSON 数据。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'data_object',
    version: '1.0.0',
    categories: ['Developer'],
    tags: ['json', 'format', 'prettify', 'minify', 'developer'],
    featured: false,
    color: '#8b5cf6',
  },

  types: {
    input: { traits: [TRAITS.text, TRAITS.structured] },
    output: { format: 'json' },
  },
  schema,
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
  },

  cost: 'low',
};
