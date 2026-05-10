import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';
import { schema } from './cron-explainer.schema';

export const contract: ToolContract = {
  id: 'cron-explainer',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'event_repeat',
    version: '1.0.0',
    categories: ['Utility'],
    tags: ['cron', 'schedule', 'crontab', 'quartz', 'time', 'devops', 'explainer', 'validator'],
    color: '#10b981',
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
