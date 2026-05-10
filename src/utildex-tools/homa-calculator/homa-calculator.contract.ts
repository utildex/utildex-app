import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { schema } from './homa-calculator.schema';

export const contract: ToolContract = {
  id: 'homa-calculator',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'monitoring',
    version: '1.0.0',
    categories: ['Health', 'Utility'],
    tags: ['homa', 'homa-ir', 'quicki', 'insulin', 'glucose', 'metabolic', 'health', 'calculator'],
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
