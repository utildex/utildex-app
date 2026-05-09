import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './url-encoder-decoder.schema';

export const contract: ToolContract = {
  id: 'url-encoder-decoder',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
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
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'wide'), cols: 2, rows: 1 },
      {
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'standard'),
        cols: 2,
        rows: 2,
      },
    ],
  },
  cost: 'low',
};
