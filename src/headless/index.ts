import { CORE_REGISTRY } from '../core/core-registry';
import type { ToolSpaceIssue } from '../core/tool-space';
import {
  collectToolSpaceRuntimeIssues,
  getResolvedToolSpaceMap,
  resolveToolSpaces,
} from '../core/tool-space-resolver';
import type { ToolContract } from '../core/tool-contract';
import type { ResolvedToolSpace } from '../core/tool-space-resolver';
import { TOOL_SPACES_REGISTRY } from '../data/tool-space-registry';
import type { ToolMetadata } from '../data/types';

type KernelRun = (input: unknown) => unknown | Promise<unknown>;

export interface ListHeadlessToolsOptions {
  mcpCompatibleOnly?: boolean;
}

export interface CallHeadlessToolOptions {
  validateInput?: boolean;
  validateOutput?: boolean;
  requireMcpCompatible?: boolean;
}

export interface HeadlessToolSpacesOptions {
  mcpCompatibleOnly?: boolean;
}

export interface HeadlessToolSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  categories: string[];
  tags: string[];
  inputTraits: string[];
  outputFormat: string;
  mcpCompatible: boolean;
  hasSchema: boolean;
}

export interface HeadlessToolDefinition extends HeadlessToolSummary {
  schema?: ToolContract['schema'];
  run: (input: unknown) => Promise<unknown>;
}

interface HeadlessCatalog {
  summaries: HeadlessToolSummary[];
  metadataById: Map<string, ToolMetadata>;
}

interface ResolvedHeadlessSpaces {
  spaces: ResolvedToolSpace[];
  issues: ToolSpaceIssue[];
  spaceMap: ReadonlyMap<string, ResolvedToolSpace>;
}

type HeadlessSpaceCacheKey = 'all' | 'mcp-only';

let headlessCatalogPromise: Promise<HeadlessCatalog> | null = null;
const headlessSpacesPromiseByKey = new Map<
  HeadlessSpaceCacheKey,
  Promise<ResolvedHeadlessSpaces>
>();

function resolveI18nText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const textMap = value as Record<string, unknown>;
  if (typeof textMap.en === 'string') {
    return textMap.en;
  }

  for (const candidate of Object.values(textMap)) {
    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  return '';
}

function assertKnownToolId(toolId: string) {
  if (!CORE_REGISTRY[toolId]) {
    const known = Object.keys(CORE_REGISTRY)
      .sort((left, right) => left.localeCompare(right))
      .join(', ');
    throw new Error(`Unknown tool id "${toolId}". Known tool ids: ${known}`);
  }
}

function toSummary(contract: ToolContract): HeadlessToolSummary {
  return {
    id: contract.id,
    name: resolveI18nText(contract.metadata.name),
    description: resolveI18nText(contract.metadata.description),
    version: contract.metadata.version,
    categories: [...contract.metadata.categories],
    tags: [...contract.metadata.tags],
    inputTraits: [...contract.types.input.traits],
    outputFormat: contract.types.output.format,
    mcpCompatible: contract.mcp?.compatible ?? true,
    hasSchema: Boolean(contract.schema),
  };
}

function toToolMetadata(toolId: string, contract: ToolContract): ToolMetadata {
  return {
    id: toolId,
    name: contract.metadata.name,
    description: contract.metadata.description,
    icon: contract.metadata.icon,
    version: contract.metadata.version,
    categories: [...contract.metadata.categories],
    tags: [...contract.metadata.tags],
    featured: contract.metadata.featured,
    color: contract.metadata.color,
    widget: contract.widget,
  };
}

async function buildHeadlessCatalog(): Promise<HeadlessCatalog> {
  const toolIds = Object.keys(CORE_REGISTRY).sort((left, right) => left.localeCompare(right));

  const summaries: HeadlessToolSummary[] = [];
  const metadataById = new Map<string, ToolMetadata>();

  for (const toolId of toolIds) {
    const contract = await CORE_REGISTRY[toolId].contract();
    summaries.push(toSummary(contract));
    metadataById.set(toolId, toToolMetadata(toolId, contract));
  }

  return {
    summaries,
    metadataById,
  };
}

function cloneHeadlessSummary(summary: HeadlessToolSummary): HeadlessToolSummary {
  return {
    ...summary,
    categories: [...summary.categories],
    tags: [...summary.tags],
    inputTraits: [...summary.inputTraits],
  };
}

async function getHeadlessCatalog(): Promise<HeadlessCatalog> {
  if (headlessCatalogPromise) {
    return headlessCatalogPromise;
  }

  headlessCatalogPromise = buildHeadlessCatalog().catch((error) => {
    headlessCatalogPromise = null;
    throw error;
  });

  return headlessCatalogPromise;
}

function getHeadlessSpaceCacheKey(options: HeadlessToolSpacesOptions): HeadlessSpaceCacheKey {
  return options.mcpCompatibleOnly ? 'mcp-only' : 'all';
}

async function resolveHeadlessSpacesUncached(
  options: HeadlessToolSpacesOptions = {},
): Promise<ResolvedHeadlessSpaces> {
  const catalog = await getHeadlessCatalog();

  const allowedToolIds = options.mcpCompatibleOnly
    ? new Set(
        catalog.summaries.filter((summary) => summary.mcpCompatible).map((summary) => summary.id),
      )
    : null;

  const filteredToolMap = new Map<string, ToolMetadata>();
  for (const [toolId, metadata] of catalog.metadataById.entries()) {
    if (allowedToolIds && !allowedToolIds.has(toolId)) {
      continue;
    }
    filteredToolMap.set(toolId, metadata);
  }

  const spaces = resolveToolSpaces(TOOL_SPACES_REGISTRY, filteredToolMap);
  const knownToolIds = new Set<string>(filteredToolMap.keys());

  return {
    spaces,
    issues: collectToolSpaceRuntimeIssues(TOOL_SPACES_REGISTRY, spaces, knownToolIds),
    spaceMap: getResolvedToolSpaceMap(spaces),
  };
}

async function resolveHeadlessSpaces(
  options: HeadlessToolSpacesOptions = {},
): Promise<ResolvedHeadlessSpaces> {
  const cacheKey = getHeadlessSpaceCacheKey(options);
  const cached = headlessSpacesPromiseByKey.get(cacheKey);

  if (cached) {
    return cached;
  }

  const nextPromise = resolveHeadlessSpacesUncached(options).catch((error) => {
    headlessSpacesPromiseByKey.delete(cacheKey);
    throw error;
  });
  headlessSpacesPromiseByKey.set(cacheKey, nextPromise);

  return nextPromise;
}

async function loadKernelRun(toolId: string): Promise<(input: unknown) => Promise<unknown>> {
  const kernelModule = await CORE_REGISTRY[toolId].kernel();
  const run = (kernelModule as Record<string, unknown>).run;

  if (typeof run !== 'function') {
    throw new Error(`Kernel for tool "${toolId}" does not export a run(input) function.`);
  }

  const runFn = run as KernelRun;
  return async (input: unknown) => Promise.resolve(runFn(input));
}

export async function listHeadlessTools(
  options: ListHeadlessToolsOptions = {},
): Promise<HeadlessToolSummary[]> {
  const catalog = await getHeadlessCatalog();
  const summaries = catalog.summaries;

  if (options.mcpCompatibleOnly) {
    return summaries
      .filter((summary) => summary.mcpCompatible)
      .map((summary) => cloneHeadlessSummary(summary));
  }

  return summaries.map((summary) => cloneHeadlessSummary(summary));
}

export async function listHeadlessSpaces(
  options: HeadlessToolSpacesOptions = {},
): Promise<ResolvedToolSpace[]> {
  const resolved = await resolveHeadlessSpaces(options);
  return structuredClone(resolved.spaces);
}

export async function getHeadlessSpace(
  spaceId: string,
  options: HeadlessToolSpacesOptions = {},
): Promise<ResolvedToolSpace | null> {
  const resolved = await resolveHeadlessSpaces(options);
  const space = resolved.spaceMap.get(spaceId);
  return space ? structuredClone(space) : null;
}

export async function listHeadlessSpaceIssues(
  options: HeadlessToolSpacesOptions = {},
): Promise<ToolSpaceIssue[]> {
  const resolved = await resolveHeadlessSpaces(options);
  return structuredClone(resolved.issues);
}

export async function listHeadlessToolsInSpace(
  spaceId: string,
  options: HeadlessToolSpacesOptions = {},
): Promise<HeadlessToolSummary[]> {
  const [space, summaries] = await Promise.all([
    getHeadlessSpace(spaceId, options),
    listHeadlessTools({ mcpCompatibleOnly: options.mcpCompatibleOnly }),
  ]);

  if (!space) {
    const knownSpaceIds = TOOL_SPACES_REGISTRY.map((entry) => entry.id)
      .sort((left, right) => left.localeCompare(right))
      .join(', ');
    throw new Error(`Unknown tool space id "${spaceId}". Known tool spaces: ${knownSpaceIds}`);
  }

  const summaryById = new Map<string, HeadlessToolSummary>();
  for (const summary of summaries) {
    summaryById.set(summary.id, summary);
  }

  const tools: HeadlessToolSummary[] = [];
  for (const tool of space.tools) {
    const summary = summaryById.get(tool.id);
    if (!summary) {
      continue;
    }
    tools.push(summary);
  }

  return tools;
}

export async function getHeadlessTool(toolId: string): Promise<HeadlessToolDefinition> {
  assertKnownToolId(toolId);

  const [contract, run] = await Promise.all([
    CORE_REGISTRY[toolId].contract(),
    loadKernelRun(toolId),
  ]);

  return {
    ...toSummary(contract),
    schema: contract.schema,
    run,
  };
}

export async function callHeadlessTool<TOutput = unknown>(
  toolId: string,
  input: unknown,
  options: CallHeadlessToolOptions = {},
): Promise<TOutput> {
  const tool = await getHeadlessTool(toolId);
  const validateInput = options.validateInput ?? true;
  const validateOutput = options.validateOutput ?? true;

  if (options.requireMcpCompatible && !tool.mcpCompatible) {
    throw new Error(`Tool "${toolId}" is not marked MCP-compatible.`);
  }

  const preparedInput =
    validateInput && tool.schema?.input ? tool.schema.input.parse(input) : input;
  const output = await tool.run(preparedInput);

  if (validateOutput && tool.schema?.output) {
    return tool.schema.output.parse(output) as TOutput;
  }

  return output as TOutput;
}
