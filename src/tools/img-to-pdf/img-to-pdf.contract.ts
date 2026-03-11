import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'img-to-pdf',

  metadata: {
    name: {
      en: 'Images to PDF',
      fr: 'Images en PDF',
      es: 'Imágenes a PDF',
      zh: '图片转 PDF',
    },
    description: {
      en: 'Convert PNG, JPG, or WEBP images into a single PDF document. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Convertissez des images PNG, JPG ou WEBP en un seul document PDF. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Convierta imagenes PNG, JPG o WEBP en un solo documento PDF. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '将 PNG、JPG 或 WEBP 图片转换为单个 PDF 文档。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'picture_as_pdf',
    version: '1.0.0',
    categories: ['Office', 'Media'],
    tags: ['pdf', 'image', 'convert', 'jpg', 'png'],
    color: '#ec4899',
  },

  types: {
    input: { traits: [TRAITS.image, TRAITS.raster] },
    output: { format: 'pdf' },
  },

  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: { en: 'Icon', fr: 'Icône', es: 'Icono', zh: '图标' }, cols: 1, rows: 1 },
      { label: { en: 'Wide', fr: 'Large', es: 'Ancho', zh: '宽' }, cols: 2, rows: 1 },
      { label: { en: 'Tall', fr: 'Haut', es: 'Alto', zh: '高' }, cols: 1, rows: 2 },
      { label: { en: 'Large', fr: 'Grand', es: 'Grande', zh: '大' }, cols: 2, rows: 2 },
    ],
  },

  cost: 'high',
};
