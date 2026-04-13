import { ToolContract } from '../../core/tool-contract';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './password-generator.schema';

export const contract: ToolContract = {
  id: 'password-generator',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'key',
    version: '1.1.0',
    categories: ['Utility', 'Security'],
    tags: ['security', 'password', 'random'],
    featured: true,
    color: '#10b981',
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
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'standard'),
        cols: 2,
        rows: 1,
      },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'compact'), cols: 1, rows: 1 },
    ],
  },
  cost: 'low',
};
