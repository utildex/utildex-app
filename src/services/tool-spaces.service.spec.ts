import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService } from './app-config.service';
import { PersistenceService } from './persistence.service';
import { ToolService } from './tool.service';
import { ToolSpacesService } from './tool-spaces.service';
import type { ToolMetadata } from '../data/types';
import type { ToolSpaceDefinition } from '../core/tool-space';

describe('ToolSpacesService', () => {
  const catalog: ToolMetadata[] = [
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

  const definitions: ToolSpaceDefinition[] = [
    {
      id: 'developer',
      name: 'Developer',
      icon: 'code',
      groups: [{ id: 'core', label: 'Core', toolIds: ['json-formatter', 'password-generator'] }],
    },
    {
      id: 'security',
      name: 'Security',
      icon: 'key',
      groups: [{ id: 'core', label: 'Core', toolIds: ['password-generator'] }],
    },
  ];

  let persistence: { storage: ReturnType<typeof vi.fn> };
  let toolService: { tools: ReturnType<typeof signal<ToolMetadata[]>> };

  beforeEach(() => {
    persistence = { storage: vi.fn() };
    toolService = { tools: signal(catalog) };

    TestBed.configureTestingModule({
      providers: [
        ToolSpacesService,
        { provide: PersistenceService, useValue: persistence },
        { provide: ToolService, useValue: toolService },
        { provide: AppConfigService, useValue: { appId: 'utildex' } },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wires selected space and remembered tool selections to persistence', () => {
    TestBed.inject(ToolSpacesService);

    expect(persistence.storage).toHaveBeenCalledWith(expect.any(Function), 'tool-space', {
      type: 'string',
      strategy: 'hybrid',
    });
    expect(persistence.storage).toHaveBeenCalledWith(
      expect.any(Function),
      'tool-space-last-tools',
      {
        type: 'object',
        strategy: 'hybrid',
      },
    );
  });

  it('falls back when the selected space is invalid', () => {
    const service = TestBed.inject(ToolSpacesService);

    service.setDefinitions(definitions);
    service.selectedSpaceId.set('missing');
    TestBed.tick();

    expect(service.selectedSpaceId()).toBe('developer');
  });

  it('remembers valid tool selections and rejects invalid ones', () => {
    const service = TestBed.inject(ToolSpacesService);
    service.setDefinitions(definitions);

    expect(service.rememberToolSelection('developer', 'password-generator')).toBe(true);
    expect(service.rememberToolSelection('developer', 'missing-tool')).toBe(false);
    expect(service.rememberToolSelection('missing-space', 'password-generator')).toBe(false);
    expect(service.lastSelectedToolBySpace()).toEqual({ developer: 'password-generator' });
  });

  it('prunes invalid remembered selections when definitions change', () => {
    const service = TestBed.inject(ToolSpacesService);
    service.setDefinitions(definitions);
    service.lastSelectedToolBySpace.set({
      developer: 'password-generator',
      security: 'json-formatter',
      missing: 'json-formatter',
    });

    TestBed.tick();

    expect(service.lastSelectedToolBySpace()).toEqual({ developer: 'password-generator' });
  });

  it('selects remembered tools first and otherwise the first available tool', () => {
    const service = TestBed.inject(ToolSpacesService);
    service.setDefinitions(definitions);

    expect(service.getPreferredToolIdForSpace('developer')).toBe('json-formatter');
    service.rememberToolSelection('developer', 'password-generator');
    expect(service.selectedToolId()).toBe('password-generator');
  });

  it('reports runtime issues for unknown tool ids after the catalog is ready', () => {
    const service = TestBed.inject(ToolSpacesService);
    service.setDefinitions([
      {
        id: 'broken',
        name: 'Broken',
        icon: 'warning',
        groups: [{ id: 'missing', label: 'Missing', toolIds: ['unknown-tool'] }],
      },
    ]);

    expect(service.runtimeIssues()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-tool-id', toolId: 'unknown-tool' }),
      ]),
    );
  });
});
