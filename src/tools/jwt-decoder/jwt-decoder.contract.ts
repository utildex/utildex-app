import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './jwt-decoder.schema';

export const contract: ToolContract = {
  id: 'jwt-decoder',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'verified_user',
    version: '1.0.0',
    categories: ['Security', 'Developer'],
    tags: ['jwt', 'json web token', 'decode', 'token', 'auth', 'security'],
    featured: true,
    color: '#0891b2',
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
      {
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'standard'),
        cols: 2,
        rows: 2,
      },
    ],
  },
  cost: 'low',
};
