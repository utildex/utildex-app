import { ToolMetadata } from '../data/types';
import { ToolSpaceDefinition, ToolSpaceGroupDefinition, ToolSpaceIssue } from './tool-space';

export interface ResolvedToolSpaceGroup {
  id: string;
  label: ToolSpaceGroupDefinition['label'];
  description?: ToolSpaceGroupDefinition['description'];
  tools: ToolMetadata[];
  missingToolIds: string[];
  duplicateToolIds: string[];
}

export interface ResolvedToolSpace {
  id: string;
  name: ToolSpaceDefinition['name'];
  description?: ToolSpaceDefinition['description'];
  icon: string;
  featured?: boolean;
  groups: ResolvedToolSpaceGroup[];
  tools: ToolMetadata[];
  missingToolIds: string[];
}

export function resolveToolSpaceGroup(
  definition: ToolSpaceGroupDefinition,
  toolMap: ReadonlyMap<string, ToolMetadata>,
): ResolvedToolSpaceGroup {
  const tools: ToolMetadata[] = [];
  const missingToolIds: string[] = [];
  const duplicateToolIds: string[] = [];
  const seen = new Set<string>();

  for (const rawToolId of definition.toolIds) {
    const toolId = rawToolId.trim();
    if (!toolId) {
      continue;
    }

    if (seen.has(toolId)) {
      duplicateToolIds.push(toolId);
      continue;
    }
    seen.add(toolId);

    const tool = toolMap.get(toolId);
    if (!tool) {
      missingToolIds.push(toolId);
      continue;
    }

    tools.push(tool);
  }

  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    tools,
    missingToolIds,
    duplicateToolIds,
  };
}

export function resolveToolSpace(
  definition: ToolSpaceDefinition,
  toolMap: ReadonlyMap<string, ToolMetadata>,
): ResolvedToolSpace {
  const groups = definition.groups.map((group) => resolveToolSpaceGroup(group, toolMap));

  const allTools: ToolMetadata[] = [];
  const seenToolIds = new Set<string>();
  const missingToolIds = new Set<string>();

  for (const group of groups) {
    for (const tool of group.tools) {
      if (seenToolIds.has(tool.id)) {
        continue;
      }
      seenToolIds.add(tool.id);
      allTools.push(tool);
    }

    for (const missingToolId of group.missingToolIds) {
      missingToolIds.add(missingToolId);
    }
  }

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    icon: definition.icon,
    featured: definition.featured,
    groups,
    tools: allTools,
    missingToolIds: [...missingToolIds],
  };
}

export function resolveToolSpaces(
  definitions: readonly ToolSpaceDefinition[],
  toolMap: ReadonlyMap<string, ToolMetadata>,
): ResolvedToolSpace[] {
  return definitions.map((space) => resolveToolSpace(space, toolMap));
}

export function getResolvedToolSpaceMap(
  resolvedSpaces: readonly ResolvedToolSpace[],
): ReadonlyMap<string, ResolvedToolSpace> {
  const map = new Map<string, ResolvedToolSpace>();
  for (const space of resolvedSpaces) {
    map.set(space.id, space);
  }
  return map;
}

export function collectToolSpaceRuntimeIssues(
  definitions: readonly ToolSpaceDefinition[],
  resolvedSpaces: readonly ResolvedToolSpace[],
  knownToolIds: ReadonlySet<string>,
): ToolSpaceIssue[] {
  const issues: ToolSpaceIssue[] = [];
  const emitted = new Set<string>();

  for (const space of definitions) {
    for (const group of space.groups) {
      for (const rawToolId of group.toolIds) {
        const toolId = rawToolId.trim();
        if (!toolId || knownToolIds.has(toolId)) {
          continue;
        }

        const issueKey = `${space.id}:${group.id}:${toolId}:unknown`;
        if (emitted.has(issueKey)) {
          continue;
        }
        emitted.add(issueKey);

        issues.push({
          severity: 'warning',
          code: 'unknown-tool-id',
          message: `Tool id "${toolId}" in tool space "${space.id}" / group "${group.id}" was not found in the tool catalog.`,
          spaceId: space.id,
          groupId: group.id,
          toolId,
        });
      }
    }
  }

  for (const space of resolvedSpaces) {
    for (const group of space.groups) {
      if (group.tools.length > 0) {
        continue;
      }

      const issueKey = `${space.id}:${group.id}:empty-after-resolution`;
      if (emitted.has(issueKey)) {
        continue;
      }
      emitted.add(issueKey);

      issues.push({
        severity: 'warning',
        code: 'empty-group-after-resolution',
        message: `Tool space "${space.id}" / group "${group.id}" resolves to zero tools with the current catalog.`,
        spaceId: space.id,
        groupId: group.id,
      });
    }
  }

  return issues;
}

export function getFallbackToolSpaceId(
  spaces: readonly ToolSpaceDefinition[],
  defaultToolSpaceId: string,
): string {
  if (spaces.some((space) => space.id === defaultToolSpaceId)) {
    return defaultToolSpaceId;
  }

  return spaces[0]?.id ?? '';
}

export function pruneInvalidToolSelections(
  selections: Record<string, string>,
  resolvedSpaces: ReadonlyMap<string, ResolvedToolSpace>,
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [spaceId, toolId] of Object.entries(selections)) {
    const space = resolvedSpaces.get(spaceId);
    if (!space) {
      continue;
    }

    if (!space.tools.some((tool) => tool.id === toolId)) {
      continue;
    }

    next[spaceId] = toolId;
  }

  return next;
}

export function getPreferredToolIdForSpace(
  spaceId: string,
  resolvedSpaces: ReadonlyMap<string, ResolvedToolSpace>,
  selections: Record<string, string>,
): string | null {
  const resolvedSpace = resolvedSpaces.get(spaceId);
  if (!resolvedSpace) {
    return null;
  }

  const remembered = selections[spaceId];
  if (remembered && resolvedSpace.tools.some((tool) => tool.id === remembered)) {
    return remembered;
  }

  return resolvedSpace.tools[0]?.id ?? null;
}
