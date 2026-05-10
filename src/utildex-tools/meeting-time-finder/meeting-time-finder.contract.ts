import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';
import { schema } from './meeting-time-finder.schema';

export const contract: ToolContract = {
  id: 'meeting-time-finder',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'groups',
    version: '1.0.0',
    categories: ['Utility'],
    tags: ['meeting', 'timezone', 'overlap', 'working-hours', 'scheduling', 'team'],
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
