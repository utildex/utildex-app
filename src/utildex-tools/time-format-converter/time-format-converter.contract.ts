import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';
import { schema } from './time-format-converter.schema';

export const contract: ToolContract = {
  id: 'time-format-converter',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'swap_horiz',
    version: '1.0.0',
    categories: ['Utility'],
    tags: ['time', 'date', 'format', 'iso8601', 'rfc3339', 'rfc2822', 'sql', 'unix', 'converter'],
    color: '#a855f7',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  schema,
  widget: {
    supported: false,
  },
  cost: 'low',
};
