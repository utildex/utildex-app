import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'qr-studio',

  metadata: {
    name: {
      en: 'QR Code Studio',
      fr: 'Studio QR Code',
      es: 'Estudio Código QR',
      zh: '二维码工作室',
    },
    description: {
      en: 'Generate static, private QR codes for URLs, WiFi, and text. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Generez des QR codes statiques et prives pour URL, WiFi et texte. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Genere codigos QR estaticos y privados para URL, WiFi y texto. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '生成用于 URL、WiFi 和文本的静态隐私二维码。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'qr_code_2',
    version: '1.0.0',
    categories: ['Utility', 'Design', 'Office'],
    tags: ['qr', 'code', 'generator', 'wifi', '2d', 'barcode'],
    color: '#0ea5e9',
    featured: true,
  },

  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'png' },
  },

  widget: {
    supported: true,
    defaultCols: 1,
    defaultRows: 1,
    presets: [
      { label: { en: 'Small', fr: 'Petit', es: 'Pequeño', zh: '小' }, cols: 1, rows: 1 },
      { label: { en: 'Wide', fr: 'Large', es: 'Ancho', zh: '宽' }, cols: 2, rows: 1 },
      { label: { en: 'Large', fr: 'Grand', es: 'Grande', zh: '大' }, cols: 2, rows: 2 },
    ],
  },

  cost: 'low',
};
