import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'image-converter',
  metadata: {
    name: {
      en: 'Image Converter',
      fr: 'Convertisseur Image',
      es: 'Convertidor de Imagen',
      zh: '图片转换器',
    },
    description: {
      en: 'Batch convert images (JPG, PNG, WEBP, HEIC) locally. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Convertissez des images (JPG, PNG, WEBP, HEIC) localement par lots. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Convierta imagenes (JPG, PNG, WEBP, HEIC) localmente por lotes. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '本地批量转换图片（JPG, PNG, WEBP, HEIC）。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'photo_library',
    version: '1.0.0',
    categories: ['Media', 'Utility'],
    tags: ['image', 'converter', 'heic', 'webp', 'jpg', 'png', 'compression'],
    color: '#ec4899',
  },
  types: {
    input: { traits: [TRAITS.image, TRAITS.raster] },
    output: { format: 'png' },
  },
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: { en: 'Icon', fr: 'Icone', es: 'Icono', zh: '图标' }, cols: 1, rows: 1 },
      { label: { en: 'Standard', fr: 'Standard', es: 'Estandar', zh: '标准' }, cols: 2, rows: 2 },
    ],
  },
  cost: 'medium',
};
