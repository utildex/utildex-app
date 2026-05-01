import { ToolContract } from '../../core/tool-contract';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './lorem-ipsum.schema';

export const contract: ToolContract = {
  id: 'lorem-ipsum',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'description',
    version: '1.0.0',
    categories: ['Utility'],
    tags: ['generator', 'text', 'lorem', 'ipsum'],
    color: '#3b82f6',
  },
  types: {
    input: { traits: [] },
    output: { format: 'text' },
  },
  schema,
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 1,
    presets: [
      {
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'default'),
        cols: 2,
        rows: 1,
      },
    ],
  },
  cost: 'low',
};
