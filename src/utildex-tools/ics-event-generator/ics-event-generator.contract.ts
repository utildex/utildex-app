import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';
import { schema } from './ics-event-generator.schema';

export const contract: ToolContract = {
  id: 'ics-event-generator',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'event_available',
    version: '1.0.0',
    categories: ['Utility'],
    tags: ['ics', 'calendar', 'ical', 'event', 'rfc5545', 'vevent', 'reminder'],
    color: '#f97316',
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
