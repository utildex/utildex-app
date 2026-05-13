import { describe, expect, it } from 'vitest';
import type { ToolMetadata } from '../data/types';
import type { ToolSpaceDefinition } from './tool-space';
import {
  collectToolSpaceRuntimeIssues,
  getFallbackToolSpaceId,
  getPreferredToolIdForSpace,
  getResolvedToolSpaceMap,
  pruneInvalidToolSelections,
  resolveToolSpaces,
} from './tool-space-resolver';

describe('tool-space resolver helpers', () => {
  const tools: ToolMetadata[] = [
    {
      id: 'json-formatter',
      name: 'JSON Formatter',
      description: 'Format JSON',
      icon: 'data_object',
      version: '1.0.0',
      categories: ['Developer'],
      tags: ['json'],
    },
    {
      id: 'password-generator',
      name: 'Password Generator',
      description: 'Generate passwords',
      icon: 'key',
      version: '1.0.0',
      categories: ['Security'],
      tags: ['password'],
    },
  ];

  const toolMap = new Map(tools.map((tool) => [tool.id, tool]));

  function makeDefinition(): ToolSpaceDefinition {
    return {
      id: 'developer',
      name: 'Developer',
      icon: 'code',
      groups: [
        {
          id: 'primary',
          label: 'Primary',
          toolIds: [' json-formatter ', 'missing-tool', 'json-formatter'],
        },
        {
          id: 'secondary',
          label: 'Secondary',
          toolIds: ['password-generator', 'json-formatter'],
        },
      ],
    };
  }

  it('resolves tools, missing ids, and duplicates without mutating definitions', () => {
    const definition = makeDefinition();
    const before = structuredClone(definition);

    const [resolved] = resolveToolSpaces([definition], toolMap);

    expect(definition).toEqual(before);
    expect(resolved.tools.map((tool) => tool.id)).toEqual(['json-formatter', 'password-generator']);
    expect(resolved.missingToolIds).toEqual(['missing-tool']);
    expect(resolved.groups[0]?.duplicateToolIds).toEqual(['json-formatter']);
  });

  it('collects deterministic runtime issues for unknown and empty resolved groups', () => {
    const definitions: ToolSpaceDefinition[] = [
      {
        id: 'broken',
        name: 'Broken',
        icon: 'warning',
        groups: [{ id: 'missing', label: 'Missing', toolIds: ['unknown'] }],
      },
    ];
    const resolved = resolveToolSpaces(definitions, toolMap);

    expect(collectToolSpaceRuntimeIssues(definitions, resolved, new Set(toolMap.keys()))).toEqual([
      expect.objectContaining({ code: 'unknown-tool-id', toolId: 'unknown' }),
      expect.objectContaining({ code: 'empty-group-after-resolution', groupId: 'missing' }),
    ]);
  });

  it('falls back to the default space or first available space', () => {
    expect(getFallbackToolSpaceId([makeDefinition()], 'developer')).toBe('developer');
    expect(getFallbackToolSpaceId([makeDefinition()], 'office')).toBe('developer');
    expect(getFallbackToolSpaceId([], 'developer')).toBe('');
  });

  it('prunes invalid remembered selections', () => {
    const resolvedMap = getResolvedToolSpaceMap(resolveToolSpaces([makeDefinition()], toolMap));

    expect(
      pruneInvalidToolSelections(
        {
          developer: 'password-generator',
          missingSpace: 'json-formatter',
          developerInvalid: 'missing-tool',
        },
        resolvedMap,
      ),
    ).toEqual({ developer: 'password-generator' });
  });

  it('prefers remembered tools, then the first available tool, then null', () => {
    const resolvedMap = getResolvedToolSpaceMap(resolveToolSpaces([makeDefinition()], toolMap));
    const emptyMap = getResolvedToolSpaceMap(
      resolveToolSpaces(
        [
          {
            id: 'empty',
            name: 'Empty',
            icon: 'empty',
            groups: [{ id: 'g', label: 'G', toolIds: [] }],
          },
        ],
        toolMap,
      ),
    );

    expect(
      getPreferredToolIdForSpace('developer', resolvedMap, { developer: 'password-generator' }),
    ).toBe('password-generator');
    expect(
      getPreferredToolIdForSpace('developer', resolvedMap, { developer: 'missing-tool' }),
    ).toBe('json-formatter');
    expect(getPreferredToolIdForSpace('empty', emptyMap, {})).toBeNull();
    expect(getPreferredToolIdForSpace('missing', resolvedMap, {})).toBeNull();
  });
});
