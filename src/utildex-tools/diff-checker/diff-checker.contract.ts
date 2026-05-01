import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './diff-checker.schema';

export const contract: ToolContract = {
  id: 'diff-checker',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'difference',
    version: '1.0.0',
    categories: ['Developer', 'Office'],
    tags: ['diff', 'compare', 'code', 'text', 'check'],
    color: '#6366f1',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  schema,
  widget: {
    supported: true,
    defaultCols: 3,
    defaultRows: 1,
    presets: [
      {
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'wideCompare'),
        cols: 3,
        rows: 1,
      },
      {
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'miniEditor'),
        cols: 2,
        rows: 2,
      },
    ],
  },
  cost: 'low',
};
