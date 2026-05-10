import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { schema } from './absi-calculator.schema';

export const contract: ToolContract = {
  id: 'absi-calculator',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'straighten',
    version: '1.0.0',
    categories: ['Health', 'Utility'],
    tags: ['absi', 'body-shape-index', 'waist', 'mortality', 'health', 'calculator'],
    color: '#8b5cf6',
  },
  types: {
    input: { traits: [TRAITS.structured] },
    output: { format: 'text' },
  },
  schema,
  widget: {
    supported: false,
  },
  cost: 'low',
};
