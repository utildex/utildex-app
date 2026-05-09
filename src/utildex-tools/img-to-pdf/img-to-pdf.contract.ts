import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './img-to-pdf.schema';

export const contract: ToolContract = {
  id: 'img-to-pdf',

  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
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
  schema,
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'icon'), cols: 1, rows: 1 },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'wide'), cols: 2, rows: 1 },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'tall'), cols: 1, rows: 2 },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'large'), cols: 2, rows: 2 },
    ],
  },

  cost: 'high',
};
