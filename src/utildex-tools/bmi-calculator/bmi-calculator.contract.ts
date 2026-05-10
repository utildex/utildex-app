import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { schema } from './bmi-calculator.schema';

export const contract: ToolContract = {
  id: 'bmi-calculator',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'monitor_weight',
    version: '1.0.0',
    categories: ['Health', 'Utility'],
    tags: ['bmi', 'body-mass-index', 'weight', 'height', 'health', 'calculator'],
    color: '#10b981',
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
