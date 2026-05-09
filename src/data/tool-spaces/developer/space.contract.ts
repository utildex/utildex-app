import type { ToolSpaceDefinition } from '../../../core/tool-space';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../../core/i18n-mapper';

export const developerToolSpaceContract: ToolSpaceDefinition = {
  id: 'developer',
  appName: 'utildex',
  name: mapLocalizedField(contractI18n, 'name'),
  description: mapLocalizedField(contractI18n, 'description'),
  icon: 'terminal',
  groups: [
    {
      id: 'code-and-markup',
      label: mapLocalizedNestedField(contractI18n, 'groups', 'codeAndMarkup'),
      toolIds: ['json-formatter', 'diff-checker', 'markdown-preview'],
    },
    {
      id: 'encoding-and-tokens',
      label: mapLocalizedNestedField(contractI18n, 'groups', 'encodingAndTokens'),
      toolIds: ['base64-encoder-decoder', 'url-encoder-decoder', 'jwt-decoder', 'hash-generator'],
    },
    {
      id: 'dev-utilities',
      label: mapLocalizedNestedField(contractI18n, 'groups', 'devUtilities'),
      toolIds: ['code-snippet-viewer', 'simple-2d-plots'],
    },
  ],
};
