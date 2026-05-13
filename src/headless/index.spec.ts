import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ToolContract } from '../core/tool-contract';
import type { ToolSpaceDefinition } from '../core/tool-space';
import type { CoreRegistryEntry } from '../core/core-registry';
import type { ToolMetadata } from '../data/types';

type HeadlessModule = typeof import('./index');
type MockRegistry = Record<string, CoreRegistryEntry>;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function makeContract(
  id: string,
  overrides: Partial<Omit<ToolContract, 'id' | 'metadata' | 'types' | 'widget' | 'cost'>> = {},
): ToolContract {
  const contract: ToolContract = {
    id,
    metadata: {
      name: { fr: `${id} FR`, en: `${id} EN` },
      description: { es: `${id} ES description` },
      icon: 'science',
      version: '1.0.0',
      categories: ['Test'],
      tags: ['test'],
    },
    types: {
      input: { traits: ['text'] },
      output: { format: 'text' },
    },
    widget: { supported: false },
    cost: 'low',
  };

  return { ...contract, ...overrides };
}

function makeSchemaContract(id: string, mcpCompatible = true): ToolContract {
  return makeContract(id, {
    schema: {
      input: z.object({ value: z.string() }),
      output: z.object({ value: z.string() }),
    },
    mcp: { compatible: mcpCompatible },
  });
}

function makeRegistryEntry(
  contract: ToolContract,
  run: (input: unknown) => unknown | Promise<unknown> = (input) => input,
): CoreRegistryEntry {
  return {
    contract: vi.fn(() => Promise.resolve(contract)),
    kernel: vi.fn(() => Promise.resolve({ run })),
  };
}

async function loadHeadlessModule(): Promise<HeadlessModule> {
  return import('./index');
}

async function loadHeadlessModuleWithMocks(
  registry: MockRegistry,
  spaces: ToolSpaceDefinition[] = [],
): Promise<HeadlessModule> {
  vi.doMock('../core/core-registry', () => ({
    getCoreRegistryForApp: vi.fn(() => registry),
  }));
  vi.doMock('../data/tool-space-registry', () => ({
    getToolSpacesForApp: vi.fn(() => spaces),
  }));

  return import('./index');
}

function fakeToolMetadata(id: string): ToolMetadata {
  return {
    id,
    name: id,
    description: id,
    icon: 'science',
    version: '1.0.0',
    categories: ['Test'],
    tags: ['test'],
  };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock('../core/core-registry');
  vi.doUnmock('../data/tool-space-registry');
});

describe('listHeadlessTools', () => {
  it('returns sorted Utildex summaries with resolved metadata and defensive arrays', async () => {
    const { listHeadlessTools } = await loadHeadlessModule();
    const tools = await listHeadlessTools();
    const ids = tools.map((tool) => tool.id);

    expect(tools.length).toBeGreaterThan(0);
    expect(ids).not.toContain('sudoku');
    expect(ids).toEqual([...ids].sort((left, right) => left.localeCompare(right)));

    for (const tool of tools) {
      expect(tool.id).toEqual(expect.any(String));
      expect(tool.id).not.toHaveLength(0);
      expect(tool.name).toEqual(expect.any(String));
      expect(tool.name).not.toHaveLength(0);
      expect(tool.description).toEqual(expect.any(String));
      expect(tool.version).toEqual(expect.any(String));
      expect(tool.version).not.toHaveLength(0);
      expect(Array.isArray(tool.categories)).toBe(true);
      expect(Array.isArray(tool.tags)).toBe(true);
      expect(Array.isArray(tool.inputTraits)).toBe(true);
      expect(typeof tool.mcpCompatible).toBe('boolean');
      expect(typeof tool.hasSchema).toBe('boolean');
    }

    expect(tools.find((tool) => tool.id === 'base64-encoder-decoder')?.mcpCompatible).toBe(true);

    const firstTool = tools[0];
    expect(firstTool).toBeDefined();
    const originalCategories = [...firstTool.categories];
    firstTool.categories.push('mutated-category');

    const freshTools = await listHeadlessTools();
    expect(freshTools.find((tool) => tool.id === firstTool.id)?.categories).toEqual(
      originalCategories,
    );
  });

  it('filters MCP-compatible summaries without assuming incompatible tools must exist', async () => {
    const { listHeadlessTools } = await loadHeadlessModule();
    const allTools = await listHeadlessTools();
    const mcpTools = await listHeadlessTools({ mcpCompatibleOnly: true });
    const allIds = new Set(allTools.map((tool) => tool.id));

    expect(mcpTools.every((tool) => tool.mcpCompatible)).toBe(true);
    expect(mcpTools.every((tool) => allIds.has(tool.id))).toBe(true);

    if (allTools.every((tool) => tool.mcpCompatible)) {
      expect(mcpTools).toHaveLength(allTools.length);
    } else {
      expect(mcpTools.length).toBeLessThan(allTools.length);
    }
  });
});

describe('getHeadlessTool', () => {
  it('returns a known tool definition with a runnable kernel and schema', async () => {
    const { getHeadlessTool } = await loadHeadlessModule();
    const tool = await getHeadlessTool('hash-generator');

    expect(tool.id).toBe('hash-generator');
    expect(tool.hasSchema).toBe(true);
    expect(tool.schema).toBeDefined();
    expect(typeof tool.run).toBe('function');
  });

  it('throws unknown-id errors with the rejected id and known ids', async () => {
    const { getHeadlessTool } = await loadHeadlessModule();

    await expect(getHeadlessTool('unknown-tool')).rejects.toThrow(/Unknown tool id/);
    await expect(getHeadlessTool('unknown-tool')).rejects.toThrow(/hash-generator/);
  });

  it('omits schema when a contract does not define one', async () => {
    const contract = makeContract('schema-free-tool');
    const { getHeadlessTool } = await loadHeadlessModuleWithMocks({
      'schema-free-tool': makeRegistryEntry(contract),
    });

    const tool = await getHeadlessTool('schema-free-tool');

    expect(tool.hasSchema).toBe(false);
    expect(tool.schema).toBeUndefined();
  });
});

describe('callHeadlessTool', () => {
  it('runs a deterministic Node-safe tool with valid input', async () => {
    const { callHeadlessTool } = await loadHeadlessModule();

    await expect(
      callHeadlessTool('hash-generator', { rawHash: 'AbCdEf', uppercase: false }),
    ).resolves.toEqual({ hash: 'abcdef' });
  });

  it('rejects invalid input when validation is enabled', async () => {
    const { callHeadlessTool } = await loadHeadlessModule();

    await expect(
      callHeadlessTool('hash-generator', { rawHash: 123, uppercase: true }),
    ).rejects.toThrow(/expected string/i);
  });

  it('passes raw input through when input validation is disabled', async () => {
    const { callHeadlessTool } = await loadHeadlessModule();

    await expect(
      callHeadlessTool('hash-generator', { rawHash: 'ABCDEF' }, { validateInput: false }),
    ).resolves.toEqual({ hash: 'abcdef' });
  });

  it('rejects non-MCP-compatible tools when explicitly required', async () => {
    const run = vi.fn((input: unknown) => input);
    const { callHeadlessTool } = await loadHeadlessModuleWithMocks({
      'non-mcp-tool': makeRegistryEntry(makeSchemaContract('non-mcp-tool', false), run),
    });

    await expect(
      callHeadlessTool('non-mcp-tool', { value: 'ok' }, { requireMcpCompatible: true }),
    ).rejects.toThrow(/not marked MCP-compatible/);
    expect(run).not.toHaveBeenCalled();
  });

  it('propagates kernel errors with the original message', async () => {
    const { callHeadlessTool } = await loadHeadlessModuleWithMocks({
      'throwing-tool': makeRegistryEntry(makeSchemaContract('throwing-tool'), () => {
        throw new Error('kernel exploded');
      }),
    });

    await expect(callHeadlessTool('throwing-tool', { value: 'ok' })).rejects.toThrow(
      'kernel exploded',
    );
  });
});

describe('headless spaces', () => {
  it('lists spaces, resolves known and unknown spaces, and lists space tools', async () => {
    const {
      getHeadlessSpace,
      listHeadlessSpaceIssues,
      listHeadlessSpaces,
      listHeadlessToolsInSpace,
    } = await loadHeadlessModule();
    const spaces = await listHeadlessSpaces();

    expect(Array.isArray(spaces)).toBe(true);
    await expect(getHeadlessSpace('nonexistent-space')).resolves.toBeNull();
    await expect(listHeadlessSpaceIssues()).resolves.toEqual(expect.any(Array));
    await expect(listHeadlessToolsInSpace('nonexistent-space')).rejects.toThrow(
      /Unknown tool space id/,
    );

    const knownSpace = spaces[0];
    if (!knownSpace) {
      return;
    }

    await expect(getHeadlessSpace(knownSpace.id)).resolves.toEqual(
      expect.objectContaining({ id: knownSpace.id }),
    );
    const tools = await listHeadlessToolsInSpace(knownSpace.id);
    expect(Array.isArray(tools)).toBe(true);
  });

  it('returns defensive copies of resolved space tool arrays', async () => {
    const { listHeadlessSpaces } = await loadHeadlessModule();
    const spaces = await listHeadlessSpaces();
    const knownSpace = spaces[0];

    if (!knownSpace) {
      return;
    }

    const originalToolIds = knownSpace.tools.map((tool) => tool.id);
    knownSpace.tools.push(fakeToolMetadata('mutated-tool'));

    const freshSpaces = await listHeadlessSpaces();
    expect(
      freshSpaces.find((space) => space.id === knownSpace.id)?.tools.map((tool) => tool.id),
    ).toEqual(originalToolIds);
  });

  it('keeps all-space and MCP-only space caches separated', async () => {
    const { listHeadlessSpaces } = await loadHeadlessModule();
    const mcpSpaces = await listHeadlessSpaces({ mcpCompatibleOnly: true });
    const allSpaces = await listHeadlessSpaces();
    const mcpOffice = mcpSpaces.find((space) => space.id === 'office');
    const allOffice = allSpaces.find((space) => space.id === 'office');

    if (!mcpOffice || !allOffice) {
      return;
    }

    expect(allOffice.tools.map((tool) => tool.id)).toContain('pdf-to-img');
    expect(mcpOffice.tools.map((tool) => tool.id)).not.toContain('pdf-to-img');
  });
});

describe('headless catalog cache behavior', () => {
  it('clears a failed catalog load so a later call can retry', async () => {
    const contract = makeContract('retry-tool');
    const contractLoader = vi
      .fn<() => Promise<ToolContract>>()
      .mockRejectedValueOnce(new Error('contract load failed'))
      .mockResolvedValueOnce(contract);
    const { listHeadlessTools } = await loadHeadlessModuleWithMocks({
      'retry-tool': {
        contract: contractLoader,
        kernel: vi.fn(() => Promise.resolve({ run: (input: unknown) => input })),
      },
    });

    await expect(listHeadlessTools()).rejects.toThrow('contract load failed');
    await expect(listHeadlessTools()).resolves.toEqual([
      expect.objectContaining({ id: 'retry-tool' }),
    ]);
    expect(contractLoader).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight catalog promise across concurrent callers', async () => {
    const contract = makeContract('slow-tool');
    const deferred = createDeferred<ToolContract>();
    const contractLoader = vi.fn(() => deferred.promise);
    const { listHeadlessTools } = await loadHeadlessModuleWithMocks({
      'slow-tool': {
        contract: contractLoader,
        kernel: vi.fn(() => Promise.resolve({ run: (input: unknown) => input })),
      },
    });

    const firstCall = listHeadlessTools();
    const secondCall = listHeadlessTools();

    expect(contractLoader).toHaveBeenCalledTimes(1);
    deferred.resolve(contract);

    await expect(Promise.all([firstCall, secondCall])).resolves.toEqual([
      [expect.objectContaining({ id: 'slow-tool' })],
      [expect.objectContaining({ id: 'slow-tool' })],
    ]);
    expect(contractLoader).toHaveBeenCalledTimes(1);
  });
});
