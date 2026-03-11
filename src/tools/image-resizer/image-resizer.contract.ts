import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'image-resizer',
  metadata: {
    name: {
      en: 'Image Resizer',
      fr: 'Redimensionner Image',
      es: 'Redimensionar Imagen',
      zh: '图片缩放',
    },
    description: {
      en: 'Resize images by percentage or dimension with live preview. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Redimensionnez des images par pourcentage ou dimension avec apercu en direct. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Redimensione imagenes por porcentaje o dimension con vista previa en vivo. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '通过百分比或尺寸调整图片大小，支持实时预览。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'aspect_ratio',
    version: '1.0.0',
    categories: ['Media', 'Design'],
    tags: ['image', 'resize', 'scale', 'dimension', 'pixel'],
    featured: true,
    color: '#3b82f6',
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
