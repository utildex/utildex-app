import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './hash-generator.schema';

export const contract: ToolContract = {
  id: 'hash-generator',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'fingerprint',
    version: '1.0.0',
    categories: ['Security', 'Developer'],
    tags: ['hash', 'md5', 'sha', 'sha256', 'checksum', 'crypto', 'security'],
    featured: true,
    color: '#6366f1',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  schema,
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      {
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'standard'),
        cols: 2,
        rows: 2,
      },
      {
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'compact'),
        cols: 2,
        rows: 1,
      },
    ],
  },
  cost: 'medium',
};
