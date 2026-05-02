import { I18nText } from '../data/types';
import type { AppId } from './app.config';

export interface ToolSpaceGroupDefinition {
  id: string;
  label: I18nText;
  description?: I18nText;
  toolIds: string[];
}

export interface ToolSpaceDefinition {
  id: string;
  appName?: AppId | 'shared';
  name: I18nText;
  description?: I18nText;
  icon: string;
  groups: ToolSpaceGroupDefinition[];
  featured?: boolean;
}

export type ToolSpaceIssueSeverity = 'error' | 'warning';

export type ToolSpaceIssueCode =
  | 'duplicate-space-id'
  | 'empty-space-id'
  | 'no-groups'
  | 'duplicate-group-id'
  | 'empty-group-id'
  | 'empty-group'
  | 'duplicate-tool-in-group'
  | 'duplicate-tool-in-space'
  | 'empty-tool-id'
  | 'unknown-tool-id'
  | 'empty-group-after-resolution';

export interface ToolSpaceIssue {
  severity: ToolSpaceIssueSeverity;
  code: ToolSpaceIssueCode;
  message: string;
  spaceId?: string;
  groupId?: string;
  toolId?: string;
}

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }
    seen.add(value);
  }

  return [...duplicates];
}

export function validateToolSpaceDefinitions(
  spaces: readonly ToolSpaceDefinition[],
): ToolSpaceIssue[] {
  const issues: ToolSpaceIssue[] = [];

  const duplicateSpaceIds = findDuplicates(spaces.map((space) => space.id));
  for (const spaceId of duplicateSpaceIds) {
    issues.push({
      severity: 'error',
      code: 'duplicate-space-id',
      message: `Duplicate tool space id "${spaceId}".`,
      spaceId,
    });
  }

  for (const space of spaces) {
    if (!space.id || !space.id.trim()) {
      issues.push({
        severity: 'error',
        code: 'empty-space-id',
        message: 'Tool space has an empty id.',
      });
    }

    if (!space.groups || space.groups.length === 0) {
      issues.push({
        severity: 'error',
        code: 'no-groups',
        message: `Tool space "${space.id}" has no groups.`,
        spaceId: space.id,
      });
      continue;
    }

    const duplicateGroupIds = findDuplicates(space.groups.map((group) => group.id));
    for (const groupId of duplicateGroupIds) {
      issues.push({
        severity: 'error',
        code: 'duplicate-group-id',
        message: `Tool space "${space.id}" has duplicate group id "${groupId}".`,
        spaceId: space.id,
        groupId,
      });
    }

    const seenInSpace = new Set<string>();

    for (const group of space.groups) {
      if (!group.id || !group.id.trim()) {
        issues.push({
          severity: 'error',
          code: 'empty-group-id',
          message: `Tool space "${space.id}" has a group with empty id.`,
          spaceId: space.id,
        });
      }

      if (!group.toolIds || group.toolIds.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'empty-group',
          message: `Group "${group.id}" in tool space "${space.id}" has no tool ids.`,
          spaceId: space.id,
          groupId: group.id,
        });
        continue;
      }

      const duplicateInGroup = findDuplicates(group.toolIds);
      for (const toolId of duplicateInGroup) {
        issues.push({
          severity: 'warning',
          code: 'duplicate-tool-in-group',
          message: `Group "${group.id}" in tool space "${space.id}" references duplicate tool id "${toolId}".`,
          spaceId: space.id,
          groupId: group.id,
          toolId,
        });
      }

      for (const rawToolId of group.toolIds) {
        const toolId = rawToolId.trim();

        if (!toolId) {
          issues.push({
            severity: 'warning',
            code: 'empty-tool-id',
            message: `Group "${group.id}" in tool space "${space.id}" contains an empty tool id.`,
            spaceId: space.id,
            groupId: group.id,
          });
          continue;
        }

        if (seenInSpace.has(toolId)) {
          issues.push({
            severity: 'warning',
            code: 'duplicate-tool-in-space',
            message: `Tool id "${toolId}" is referenced multiple times in tool space "${space.id}".`,
            spaceId: space.id,
            groupId: group.id,
            toolId,
          });
          continue;
        }

        seenInSpace.add(toolId);
      }
    }
  }

  return issues;
}
