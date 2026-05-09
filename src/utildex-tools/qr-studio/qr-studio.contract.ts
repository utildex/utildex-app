import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './qr-studio.schema';

export const contract: ToolContract = {
  id: 'qr-studio',

  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
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
  schema,
  widget: {
    supported: true,
    defaultCols: 1,
    defaultRows: 1,
    presets: [
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'small'), cols: 1, rows: 1 },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'wide'), cols: 2, rows: 1 },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'large'), cols: 2, rows: 2 },
    ],
  },

  cost: 'low',
};
