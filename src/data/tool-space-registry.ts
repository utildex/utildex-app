import type { ToolSpaceDefinition } from '../core/tool-space';
import { developerToolSpaceContract } from './tool-spaces/developer/space.contract';
import { officeToolSpaceContract } from './tool-spaces/office/space.contract';

export const DEFAULT_TOOL_SPACE_ID = 'developer';

export const TOOL_SPACES_REGISTRY: ToolSpaceDefinition[] = [
  developerToolSpaceContract,
  officeToolSpaceContract,
];
