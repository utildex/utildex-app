import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ToolMetadata } from '../data/types';
import {
  ToolSpaceDefinition,
  ToolSpaceIssue,
  validateToolSpaceDefinitions,
} from '../core/tool-space';
import {
  collectToolSpaceRuntimeIssues,
  getFallbackToolSpaceId,
  getPreferredToolIdForSpace,
  getResolvedToolSpaceMap,
  pruneInvalidToolSelections,
  resolveToolSpaces,
} from '../core/tool-space-resolver';
import type { ResolvedToolSpace } from '../core/tool-space-resolver';
import { DEFAULT_TOOL_SPACE_ID, getToolSpacesForApp } from '../data/tool-space-registry';
import { PersistenceService } from './persistence.service';
import { ToolService } from './tool.service';
import { AppConfigService } from './app-config.service';

export type { ResolvedToolSpace, ResolvedToolSpaceGroup } from '../core/tool-space-resolver';

const SELECTED_SPACE_STORAGE_KEY = 'tool-space';
const LAST_SELECTED_TOOLS_STORAGE_KEY = 'tool-space-last-tools';

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
  private appConfig = inject(AppConfigService);

  private spaceDefinitions = signal<ToolSpaceDefinition[]>(
    getToolSpacesForApp(this.appConfig.appId),
  );

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
    return resolveToolSpaces(this.spaceDefinitions(), map);
  });

  private resolvedSpaceMap = computed(() => {
    return getResolvedToolSpaceMap(this.resolvedSpaces());
  });

  runtimeIssues = computed(() => {
    if (!this.toolCatalogReady()) {
      return [] as ToolSpaceIssue[];
    }

    return collectToolSpaceRuntimeIssues(
      this.spaceDefinitions(),
      this.resolvedSpaces(),
      new Set<string>(this.toolService.tools().map((tool) => tool.id)),
    );
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
        const fallbackId = getFallbackToolSpaceId(spaces, DEFAULT_TOOL_SPACE_ID);

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
        const next = pruneInvalidToolSelections(current, this.resolvedSpaceMap());

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
    return getPreferredToolIdForSpace(
      spaceId,
      this.resolvedSpaceMap(),
      this.lastSelectedToolBySpace(),
    );
  }
}
