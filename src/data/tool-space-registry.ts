import type { ToolSpaceDefinition } from '../core/tool-space';
import type { AppId } from '../core/app.config';
import { developerToolSpaceContract } from './tool-spaces/developer/space.contract';
import { officeToolSpaceContract } from './tool-spaces/office/space.contract';

export const DEFAULT_TOOL_SPACE_ID = 'developer';

export const TOOL_SPACES_REGISTRY: ToolSpaceDefinition[] = [
  developerToolSpaceContract,
  officeToolSpaceContract,
];

export function getToolSpacesForApp(appId: AppId): ToolSpaceDefinition[] {
  return TOOL_SPACES_REGISTRY.filter((space) => {
    const owner = space.appName ?? 'utildex';
    return owner === 'shared' || owner === appId;
  });
}
