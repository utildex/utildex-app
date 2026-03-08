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
      en: 'Batch convert images (JPG, PNG, WEBP, HEIC) locally. Resize and compress securely.',
      fr: 'Convertissez des images (JPG, PNG, WEBP, HEIC) localement par lots. Redimensionnez et compressez en toute securite.',
      es: 'Convierta imagenes (JPG, PNG, WEBP, HEIC) localmente por lotes. Redimensione y comprima de forma segura.',
      zh: '本地批量转换图片（JPG, PNG, WEBP, HEIC）。安全地调整大小和压缩。',
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
