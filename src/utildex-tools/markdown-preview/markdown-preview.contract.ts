import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { schema } from './markdown-preview.schema';

export const contract: ToolContract = {
  id: 'markdown-preview',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'markdown',
    version: '1.0.0',
    categories: ['Developer'],
    tags: ['developer', 'markdown', 'editor', 'preview'],
    featured: true,
    color: '#f59e0b',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  schema,
  widget: { supported: true, defaultCols: 2, defaultRows: 2 },
  cost: 'low',
};
