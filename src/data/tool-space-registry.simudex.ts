import type { ToolSpaceDefinition } from '../core/tool-space';
import type { AppId } from '../core/app.config';

export const DEFAULT_TOOL_SPACE_ID = '';

export const TOOL_SPACES_REGISTRY: ToolSpaceDefinition[] = [];

export function getToolSpacesForApp(appId: AppId): ToolSpaceDefinition[] {
  return TOOL_SPACES_REGISTRY.filter((space) => {
    const owner = space.appName ?? 'shared';
    return owner === 'shared' || owner === appId;
  });
}
