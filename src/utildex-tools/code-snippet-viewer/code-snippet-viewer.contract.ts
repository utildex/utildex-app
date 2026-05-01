import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { schema } from './code-snippet-viewer.schema';

export const contract: ToolContract = {
  id: 'code-snippet-viewer',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'code_blocks',
    version: '1.0.0',
    categories: ['Developer'],
    tags: ['code', 'snippet', 'image', 'prism', 'beautify'],
    featured: true,
    color: '#0ea5e9',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'png' },
  },
  schema,
  widget: {
    supported: false,
  },
  cost: 'low',
};
