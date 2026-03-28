import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { schema } from './url-encoder-decoder.schema';

export const contract: ToolContract = {
  id: 'url-encoder-decoder',
  metadata: {
    name: {
      en: 'URL Encoder Decoder',
      fr: 'Encodeur Décodeur URL',
      es: 'Codificador Decodificador URL',
      zh: 'URL 编码解码器',
    },
    description: {
      en: 'Encode text for URLs and decode percent-encoded strings instantly. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Encodez du texte pour les URL et décodez instantanément les chaînes encodées en pourcentage. Aucune donnée ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper Internet.',
      es: 'Codifica texto para URL y decodifica cadenas con porcentaje al instante. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '将文本编码为 URL 格式，并快速解码百分号编码字符串。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'link',
    version: '1.0.0',
    categories: ['Developer', 'Utility'],
    tags: ['url', 'encode', 'decode', 'percent-encoding', 'uri', 'query'],
    featured: false,
    color: '#f59e0b',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  schema,
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: { en: 'Wide', fr: 'Large', es: 'Ancho', zh: '宽屏' }, cols: 2, rows: 1 },
      { label: { en: 'Standard', fr: 'Standard', es: 'Estándar', zh: '标准' }, cols: 2, rows: 2 },
    ],
  },
  cost: 'low',
};
