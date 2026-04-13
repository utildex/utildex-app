import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './json-formatter.schema';

export const contract: ToolContract = {
  id: 'json-formatter',

  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'data_object',
    version: '1.0.0',
    categories: ['Developer'],
    tags: ['json', 'format', 'prettify', 'minify', 'developer'],
    featured: false,
    color: '#8b5cf6',
  },

  types: {
    input: { traits: [TRAITS.text, TRAITS.structured] },
    output: { format: 'json' },
  },
  schema,
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
  },

  cost: 'low',
};
