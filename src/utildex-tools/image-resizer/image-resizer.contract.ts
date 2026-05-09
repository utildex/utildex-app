import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './image-resizer.schema';

export const contract: ToolContract = {
  id: 'image-resizer',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'aspect_ratio',
    version: '1.0.0',
    categories: ['Media', 'Design'],
    tags: ['image', 'resize', 'scale', 'dimension', 'pixel'],
    featured: true,
    color: '#3b82f6',
  },
  types: {
    input: { traits: [TRAITS.image, TRAITS.raster] },
    output: { format: 'png' },
  },
  schema,
  mcp: {
    compatible: false,
  },
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'icon'), cols: 1, rows: 1 },
      {
        label: mapLocalizedNestedField(contractI18n, 'widgetPresets', 'standard'),
        cols: 2,
        rows: 2,
      },
    ],
  },
  cost: 'medium',
};
