import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';

export const contract: ToolContract = {
  id: 'mental-math',
  metadata: {
    appName: 'synedex',
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'calculate',
    version: '0.1.0',
    categories: ['Cognition'],
    tags: ['mental math', 'arithmetic', 'calculation', 'speed'],
    color: '#2563eb',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  widget: {
    supported: false,
  },
  cost: 'low',
};
