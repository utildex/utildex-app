import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'base64-encoder-decoder',
  metadata: {
    name: {
      en: 'Base64 Encoder Decoder',
      fr: 'Encodeur Décodeur Base64',
      es: 'Codificador Decodificador Base64',
      zh: 'Base64 编码解码器',
    },
    description: {
      en: 'Encode plain text to Base64 and decode Base64 back to text instantly. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Encodez du texte en Base64 et décodez du Base64 en texte instantanément. Aucune donnée ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Codifica texto en Base64 y decodifica Base64 a texto al instante. Ningún dato sale de su dispositivo. Funciona completamente sin conexión; puede desconectar internet.',
      zh: '将纯文本编码为 Base64，并将 Base64 快速解码为文本。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'data_object',
    version: '1.0.0',
    categories: ['Developer', 'Utility'],
    tags: ['base64', 'encode', 'decode', 'text', 'developer', 'converter'],
    featured: true,
    color: '#0ea5a5',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
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
