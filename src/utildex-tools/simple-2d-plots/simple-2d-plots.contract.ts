import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { schema } from './simple-2d-plots.schema';

export const contract: ToolContract = {
  id: 'simple-2d-plots',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'timeline',
    version: '1.0.0',
    categories: ['Developer', 'Data'],
    tags: ['plot', 'chart', '2d', 'json', 'visualization', 'graph'],
    featured: false,
    color: '#0ea5e9',
  },
  types: {
    input: { traits: [TRAITS.text, TRAITS.structured] },
    output: { format: 'json' },
  },
  schema,
  widget: {
    supported: false,
  },
  cost: 'low',
};
