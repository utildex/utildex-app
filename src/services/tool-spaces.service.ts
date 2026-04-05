import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { I18nText, ToolMetadata } from '../data/types';
import {
  ToolSpaceDefinition,
  ToolSpaceGroupDefinition,
  ToolSpaceIssue,
  validateToolSpaceDefinitions,
} from '../core/tool-space';
import { DEFAULT_TOOL_SPACE_ID, TOOL_SPACES_REGISTRY } from '../data/tool-space-registry';
import { PersistenceService } from './persistence.service';
import { ToolService } from './tool.service';

const SELECTED_SPACE_STORAGE_KEY = 'tool-space';
const LAST_SELECTED_TOOLS_STORAGE_KEY = 'tool-space-last-tools';

export interface ResolvedToolSpaceGroup {
  id: string;
  label: I18nText;
  description?: I18nText;
  tools: ToolMetadata[];
  missingToolIds: string[];
  duplicateToolIds: string[];
}

export interface ResolvedToolSpace {
  id: string;
  name: I18nText;
  description?: I18nText;
  icon: string;
  featured?: boolean;
  groups: ResolvedToolSpaceGroup[];
  tools: ToolMetadata[];
  missingToolIds: string[];
}

function areStringRecordsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}

@Injectable({
  providedIn: 'root',
})
export class ToolSpacesService {
  private toolService = inject(ToolService);
  private persistence = inject(PersistenceService);

  private spaceDefinitions = signal<ToolSpaceDefinition[]>(TOOL_SPACES_REGISTRY);

  selectedSpaceId = signal<string>(DEFAULT_TOOL_SPACE_ID);
  lastSelectedToolBySpace = signal<Record<string, string>>({});

  definitions = computed(() => this.spaceDefinitions());

  definitionIssues = computed(() => validateToolSpaceDefinitions(this.spaceDefinitions()));

  private toolCatalogReady = computed(() => this.toolService.tools().length > 0);

  private toolMap = computed(() => {
    const map = new Map<string, ToolMetadata>();
    for (const tool of this.toolService.tools()) {
      map.set(tool.id, tool);
    }
    return map;
  });

  resolvedSpaces = computed(() => {
    const map = this.toolMap();
    return this.spaceDefinitions().map((space) => this.resolveSpace(space, map));
  });

  private resolvedSpaceMap = computed(() => {
    const map = new Map<string, ResolvedToolSpace>();
    for (const space of this.resolvedSpaces()) {
      map.set(space.id, space);
    }
    return map;
  });

  runtimeIssues = computed(() => {
    if (!this.toolCatalogReady()) {
      return [] as ToolSpaceIssue[];
    }

    const issues: ToolSpaceIssue[] = [];
    const emitted = new Set<string>();
    const knownToolIds = new Set<string>(this.toolService.tools().map((tool) => tool.id));

    for (const space of this.spaceDefinitions()) {
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

    for (const space of this.resolvedSpaces()) {
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
  });

  issues = computed(() => [...this.definitionIssues(), ...this.runtimeIssues()]);

  selectedSpace = computed(() => this.getResolvedSpace(this.selectedSpaceId()));

  selectedToolId = computed(() => this.getPreferredToolIdForSpace(this.selectedSpaceId()));

  constructor() {
    this.persistence.storage(this.selectedSpaceId, SELECTED_SPACE_STORAGE_KEY, {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.lastSelectedToolBySpace, LAST_SELECTED_TOOLS_STORAGE_KEY, {
      type: 'object',
      strategy: 'hybrid',
    });

    effect(
      () => {
        const spaces = this.spaceDefinitions();
        const selected = this.selectedSpaceId();
        const fallbackId = this.getFallbackSpaceId(spaces);

        if (!selected || !spaces.some((space) => space.id === selected)) {
          if (selected !== fallbackId) {
            this.selectedSpaceId.set(fallbackId);
          }
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const current = this.lastSelectedToolBySpace();
        const next = this.pruneInvalidSelections(current, this.resolvedSpaceMap());

        if (!areStringRecordsEqual(current, next)) {
          this.lastSelectedToolBySpace.set(next);
        }
      },
      { allowSignalWrites: true },
    );
  }

  setDefinitions(definitions: ToolSpaceDefinition[]) {
    this.spaceDefinitions.set(definitions);
  }

  setSelectedSpace(spaceId: string): boolean {
    if (!this.resolvedSpaceMap().has(spaceId)) {
      return false;
    }

    this.selectedSpaceId.set(spaceId);
    return true;
  }

  getResolvedSpace(spaceId: string): ResolvedToolSpace | null {
    return this.resolvedSpaceMap().get(spaceId) ?? null;
  }

  listSpaces(): ResolvedToolSpace[] {
    return this.resolvedSpaces();
  }

  rememberToolSelection(spaceId: string, toolId: string): boolean {
    const space = this.getResolvedSpace(spaceId);
    if (!space) {
      return false;
    }

    const existsInSpace = space.tools.some((tool) => tool.id === toolId);
    if (!existsInSpace) {
      return false;
    }

    this.lastSelectedToolBySpace.update((current) => ({
      ...current,
      [spaceId]: toolId,
    }));
    return true;
  }

  clearRememberedToolSelection(spaceId: string) {
    this.lastSelectedToolBySpace.update((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, spaceId)) {
        return current;
      }

      const next = { ...current };
      delete next[spaceId];
      return next;
    });
  }

  getPreferredToolIdForSpace(spaceId: string): string | null {
    const resolvedSpace = this.getResolvedSpace(spaceId);
    if (!resolvedSpace) {
      return null;
    }

    const remembered = this.lastSelectedToolBySpace()[spaceId];
    if (remembered && resolvedSpace.tools.some((tool) => tool.id === remembered)) {
      return remembered;
    }

    return resolvedSpace.tools[0]?.id ?? null;
  }

  private resolveSpace(
    definition: ToolSpaceDefinition,
    toolMap: ReadonlyMap<string, ToolMetadata>,
  ): ResolvedToolSpace {
    const groups = definition.groups.map((group) => this.resolveGroup(group, toolMap));

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

  private resolveGroup(
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

  private getFallbackSpaceId(spaces: readonly ToolSpaceDefinition[]): string {
    if (spaces.some((space) => space.id === DEFAULT_TOOL_SPACE_ID)) {
      return DEFAULT_TOOL_SPACE_ID;
    }

    return spaces[0]?.id ?? '';
  }

  private pruneInvalidSelections(
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
}
