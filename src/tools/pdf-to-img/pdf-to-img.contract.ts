import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'pdf-to-img',
  metadata: {
    name: { en: 'PDF to Image', fr: 'PDF en Image', es: 'PDF a Imagen', zh: 'PDF 转图片' },
    description: {
      en: 'Convert PDF pages to JPG, PNG, or WebP images. High resolution supported.',
      fr: 'Convertissez des pages PDF en images JPG, PNG ou WebP. Haute resolution supportee.',
      es: 'Convierta paginas PDF a imagenes JPG, PNG o WebP. Alta resolucion soportada.',
      zh: '将 PDF 页面转换为 JPG、PNG 或 WebP 图片。支持高分辨率。',
    },
    icon: 'image',
    version: '1.0.0',
    categories: ['Office', 'Media'],
    tags: ['pdf', 'image', 'convert', 'jpg', 'png', 'webp'],
    color: '#10b981',
  },
  types: {
    input: { traits: [TRAITS.document] },
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
  cost: 'high',
};
