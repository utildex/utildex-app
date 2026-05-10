import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';
import { schema } from './timezone-converter.schema';

export const contract: ToolContract = {
  id: 'timezone-converter',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'public',
    version: '1.0.0',
    categories: ['Utility'],
    tags: ['time', 'timezone', 'tz', 'utc', 'iana', 'dst', 'converter'],
    color: '#14b8a6',
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
