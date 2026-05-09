import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './merge-pdf.schema';

export const contract: ToolContract = {
  id: 'merge-pdf',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'join_full',
    version: '1.0.0',
    categories: ['Office', 'Utility'],
    tags: ['pdf', 'merge', 'combine', 'join', 'document'],
    color: '#8b5cf6',
  },
  types: {
    input: { traits: [TRAITS.document] },
    output: { format: 'pdf' },
  },
  schema,
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'icon'), cols: 1, rows: 1 },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'wide'), cols: 2, rows: 1 },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'tall'), cols: 1, rows: 2 },
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'large'), cols: 2, rows: 2 },
    ],
  },
  cost: 'high',
};
