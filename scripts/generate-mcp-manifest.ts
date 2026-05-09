import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

import type { ToolContract } from '../src/core/tool-contract';
import { validateToolSpaceDefinitions } from '../src/core/tool-space';
import type { ToolSpaceDefinition } from '../src/core/tool-space';
import { getToolSpacesForApp } from '../src/data/tool-space-registry';
import type { I18nText } from '../src/data/types';

const SPACE_PAGE_SIZE = 50;
const GROUP_TOOL_PAGE_SIZE = 25;

const OUT_ROOT = path.join(process.cwd(), 'src', 'assets', 'mcp');
const WEB_ROOT = '/assets/mcp';
const ACTIVE_APP_ID = 'utildex';

const FALLBACK_SPACE_ID = 'all-other-tools';
const FALLBACK_GROUP_ID = 'other-tools';

interface ToolIndexModule {
  contract?: ToolContract;
}

interface CompiledTool {
  appName: 'utildex' | 'synedex' | 'shared';
  id: string;
  title: string;
  oneLine: string;
  description: string;
  icon: string;
  version: string;
  categories: string[];
  tags: string[];
  featured: boolean;
  color: string | null;
  inputTraits: string[];
  outputFormat: string;
  cost: ToolContract['cost'];
  hasSchema: boolean;
  mcpCompatible: boolean;
}

interface SpaceSummary {
  spaceId: string;
  title: string;
  purpose: string;
  icon: string;
  featured: boolean;
  groupCount: number;
  toolCount: number;
  topCategories: string[];
  href: string;
}

function resolveI18n(text: I18nText | undefined | null, lang: string = 'en'): string {
  if (!text) return '';
  if (typeof text === 'string') return text;

  return text[lang] || text['en'] || Object.values(text)[0] || '';
}

function toOneLine(text: string, maxLength: number = 180): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, '_');
}

function toWebPath(...segments: string[]): string {
  return `${WEB_ROOT}/${segments.map((segment) => encodeSegment(segment)).join('/')}`;
}

function writeJson(relativePath: string, data: unknown) {
  const absolutePath = path.join(OUT_ROOT, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(data, null, 2)}\n`);
}

function paginate<T>(items: readonly T[], pageSize: number): T[][] {
  if (pageSize <= 0) {
    throw new Error(`Page size must be > 0. Received: ${pageSize}`);
  }

  if (items.length === 0) {
    return [[]];
  }

  const pages: T[][] = [];

  for (let offset = 0; offset < items.length; offset += pageSize) {
    pages.push(items.slice(offset, offset + pageSize));
  }

  return pages;
}

function cloneToolSpaces(spaces: readonly ToolSpaceDefinition[]): ToolSpaceDefinition[] {
  return spaces.map((space) => ({
    ...space,
    groups: space.groups.map((group) => ({
      ...group,
      toolIds: [...group.toolIds],
    })),
  }));
}

function buildToolRef(tool: CompiledTool) {
  return {
    toolId: tool.id,
    title: tool.title,
    oneLine: tool.oneLine,
    inputTraits: tool.inputTraits,
    outputFormat: tool.outputFormat,
    cost: tool.cost,
    mcpCompatible: tool.mcpCompatible,
    href: toWebPath('tools', `${tool.id}.json`),
  };
}

function countTopCategories(tools: CompiledTool[]): string[] {
  const counts = new Map<string, number>();

  for (const tool of tools) {
    for (const category of tool.categories) {
      counts.set(category, (counts.get(category) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, 8)
    .map(([category]) => category);
}

async function loadToolContracts(): Promise<CompiledTool[]> {
  const toolsDir = path.join(process.cwd(), 'src', 'utildex-tools');
  const toolFolders = fs
    .readdirSync(toolsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const loadedTools = await Promise.all(
    toolFolders.map(async (folder) => {
      const indexFile = path.join(toolsDir, folder, 'index.ts');
      if (!fs.existsSync(indexFile)) {
        throw new Error(`[mcp-manifest] Missing tool index: ${indexFile}`);
      }

      const mod = (await import(pathToFileURL(indexFile).href)) as ToolIndexModule;
      const contract = mod.contract;

      if (!contract?.id) {
        throw new Error(`[mcp-manifest] Missing contract export in ${indexFile}`);
      }

      if (contract.id !== folder) {
        throw new Error(
          `[mcp-manifest] Folder and contract id mismatch: folder="${folder}", contract.id="${contract.id}"`,
        );
      }

      return {
        appName: contract.metadata.appName ?? 'utildex',
        id: contract.id,
        title: resolveI18n(contract.metadata.name, 'en'),
        oneLine: toOneLine(resolveI18n(contract.metadata.description, 'en')),
        description: resolveI18n(contract.metadata.description, 'en'),
        icon: contract.metadata.icon,
        version: contract.metadata.version,
        categories: [...contract.metadata.categories],
        tags: [...contract.metadata.tags],
        featured: Boolean(contract.metadata.featured),
        color: contract.metadata.color ?? null,
        inputTraits: [...contract.types.input.traits],
        outputFormat: contract.types.output.format,
        cost: contract.cost,
        hasSchema: Boolean(contract.schema),
        mcpCompatible: contract.mcp?.compatible ?? true,
      } satisfies CompiledTool;
    }),
  );

  const seen = new Set<string>();
  for (const tool of loadedTools) {
    if (seen.has(tool.id)) {
      throw new Error(`[mcp-manifest] Duplicate tool id detected: ${tool.id}`);
    }
    seen.add(tool.id);
  }

  return loadedTools.filter((tool) => tool.appName === 'shared' || tool.appName === ACTIVE_APP_ID);
}

function addFallbackSpaceIfNeeded(
  spaces: ToolSpaceDefinition[],
  allToolIds: readonly string[],
): ToolSpaceDefinition[] {
  const referenced = new Set<string>();

  for (const space of spaces) {
    for (const group of space.groups) {
      for (const rawToolId of group.toolIds) {
        const toolId = rawToolId.trim();
        if (toolId) {
          referenced.add(toolId);
        }
      }
    }
  }

  const missing = allToolIds.filter((toolId) => !referenced.has(toolId));

  if (missing.length === 0) {
    return spaces;
  }

  const fallbackSpace: ToolSpaceDefinition = {
    id: FALLBACK_SPACE_ID,
    name: {
      en: 'All Other Tools',
    },
    description: {
      en: 'Automatically generated fallback space for tools not mapped to curated spaces.',
    },
    icon: 'apps',
    groups: [
      {
        id: FALLBACK_GROUP_ID,
        label: {
          en: 'Other Tools',
        },
        toolIds: missing,
      },
    ],
  };

  return [...spaces, fallbackSpace];
}

async function main() {
  console.log('[mcp-manifest] Generating MCP discovery artifacts...');

  const tools = await loadToolContracts();
  const toolMap = new Map<string, CompiledTool>(tools.map((tool) => [tool.id, tool]));

  const spaces = addFallbackSpaceIfNeeded(
    cloneToolSpaces(getToolSpacesForApp(ACTIVE_APP_ID)),
    tools.map((tool) => tool.id),
  );

  const definitionIssues = validateToolSpaceDefinitions(spaces);
  const definitionErrors = definitionIssues.filter((issue) => issue.severity === 'error');
  if (definitionErrors.length > 0) {
    throw new Error(
      `[mcp-manifest] Invalid tool space definitions:\n${definitionErrors
        .map((issue) => `- [${issue.code}] ${issue.message}`)
        .join('\n')}`,
    );
  }

  const unknownRefs: string[] = [];
  for (const space of spaces) {
    for (const group of space.groups) {
      for (const rawToolId of group.toolIds) {
        const toolId = rawToolId.trim();
        if (!toolId) {
          continue;
        }

        if (!toolMap.has(toolId)) {
          unknownRefs.push(`${space.id}/${group.id}:${toolId}`);
        }
      }
    }
  }

  if (unknownRefs.length > 0) {
    throw new Error(
      `[mcp-manifest] Unknown tool references detected in spaces:\n${unknownRefs
        .sort((left, right) => left.localeCompare(right))
        .map((item) => `- ${item}`)
        .join('\n')}`,
    );
  }

  const definitionWarnings = definitionIssues.filter((issue) => issue.severity === 'warning');
  if (definitionWarnings.length > 0) {
    console.warn(
      `[mcp-manifest] ${definitionWarnings.length} warning(s):\n${definitionWarnings
        .map((issue) => `- [${issue.code}] ${issue.message}`)
        .join('\n')}`,
    );
  }

  fs.rmSync(OUT_ROOT, { recursive: true, force: true });

  const toolMembership = new Map<string, Array<{ spaceId: string; groupId: string }>>();
  const spaceSummaries: SpaceSummary[] = [];

  let totalGroups = 0;

  for (const space of spaces) {
    const encodedSpaceId = encodeSegment(space.id);
    const spaceToolIds = new Set<string>();

    const groupSummaries = [] as Array<{
      groupId: string;
      label: string;
      purpose: string;
      toolCount: number;
      href: string;
    }>;

    for (const group of space.groups) {
      totalGroups += 1;

      const encodedGroupId = encodeSegment(group.id);
      const uniqueToolIds: string[] = [];
      const seenInGroup = new Set<string>();

      for (const rawToolId of group.toolIds) {
        const toolId = rawToolId.trim();
        if (!toolId || seenInGroup.has(toolId) || !toolMap.has(toolId)) {
          continue;
        }

        seenInGroup.add(toolId);
        uniqueToolIds.push(toolId);
        spaceToolIds.add(toolId);

        if (!toolMembership.has(toolId)) {
          toolMembership.set(toolId, []);
        }
        toolMembership.get(toolId)!.push({ spaceId: space.id, groupId: group.id });
      }

      const toolPages = paginate(uniqueToolIds, GROUP_TOOL_PAGE_SIZE);
      for (let pageIndex = 0; pageIndex < toolPages.length; pageIndex += 1) {
        const pageNumber = pageIndex + 1;
        const currentPageToolIds = toolPages[pageIndex];

        writeJson(
          path.join('groups', encodedSpaceId, encodedGroupId, `page-${pageNumber}.json`),
          {
            schemaVersion: '1.0',
            kind: 'group-tools-page',
            spaceId: space.id,
            groupId: group.id,
            page: pageNumber,
            pageSize: GROUP_TOOL_PAGE_SIZE,
            totalTools: uniqueToolIds.length,
            hasMore: pageNumber < toolPages.length,
            nextPageHref:
              pageNumber < toolPages.length
                ? toWebPath('groups', space.id, group.id, `page-${pageNumber + 1}.json`)
                : null,
            items: currentPageToolIds.map((toolId) => buildToolRef(toolMap.get(toolId)!)),
          },
        );
      }

      groupSummaries.push({
        groupId: group.id,
        label: resolveI18n(group.label, 'en'),
        purpose: toOneLine(resolveI18n(group.description, 'en')),
        toolCount: uniqueToolIds.length,
        href: toWebPath('groups', space.id, group.id, 'page-1.json'),
      });
    }

    const spaceTools = [...spaceToolIds].map((toolId) => toolMap.get(toolId)!);
    const spaceSummary: SpaceSummary = {
      spaceId: space.id,
      title: resolveI18n(space.name, 'en'),
      purpose: toOneLine(resolveI18n(space.description, 'en')),
      icon: space.icon,
      featured: Boolean(space.featured),
      groupCount: space.groups.length,
      toolCount: spaceTools.length,
      topCategories: countTopCategories(spaceTools),
      href: toWebPath('spaces', `${space.id}.json`),
    };

    spaceSummaries.push(spaceSummary);

    writeJson(path.join('spaces', `${encodedSpaceId}.json`), {
      schemaVersion: '1.0',
      kind: 'space-detail',
      spaceId: space.id,
      title: resolveI18n(space.name, 'en'),
      purpose: resolveI18n(space.description, 'en'),
      icon: space.icon,
      featured: Boolean(space.featured),
      groupCount: space.groups.length,
      toolCount: spaceTools.length,
      topCategories: countTopCategories(spaceTools),
      groups: groupSummaries,
    });
  }

  const orderedSpaceSummaries = [...spaceSummaries].sort((left, right) => {
    if (left.featured !== right.featured) {
      return Number(right.featured) - Number(left.featured);
    }
    return left.spaceId.localeCompare(right.spaceId);
  });

  const spacePages = paginate(orderedSpaceSummaries, SPACE_PAGE_SIZE);

  for (let pageIndex = 0; pageIndex < spacePages.length; pageIndex += 1) {
    const pageNumber = pageIndex + 1;

    writeJson(path.join('spaces', `page-${pageNumber}.json`), {
      schemaVersion: '1.0',
      kind: 'space-index-page',
      page: pageNumber,
      pageSize: SPACE_PAGE_SIZE,
      totalSpaces: orderedSpaceSummaries.length,
      hasMore: pageNumber < spacePages.length,
      nextPageHref:
        pageNumber < spacePages.length
          ? toWebPath('spaces', `page-${pageNumber + 1}.json`)
          : null,
      items: spacePages[pageIndex],
    });
  }

  writeJson(path.join('spaces', 'index.json'), {
    schemaVersion: '1.0',
    kind: 'space-index-page',
    page: 1,
    pageSize: SPACE_PAGE_SIZE,
    totalSpaces: orderedSpaceSummaries.length,
    hasMore: spacePages.length > 1,
    nextPageHref: spacePages.length > 1 ? toWebPath('spaces', 'page-2.json') : null,
    items: spacePages[0],
  });

  for (const tool of tools) {
    const encodedToolId = encodeSegment(tool.id);
    const memberships = toolMembership.get(tool.id) || [];

    writeJson(path.join('tools', `${encodedToolId}.json`), {
      schemaVersion: '1.0',
      kind: 'tool-detail',
      toolId: tool.id,
      title: tool.title,
      description: tool.description,
      oneLine: tool.oneLine,
      icon: tool.icon,
      version: tool.version,
      categories: tool.categories,
      tags: tool.tags,
      featured: tool.featured,
      color: tool.color,
      inputTraits: tool.inputTraits,
      outputFormat: tool.outputFormat,
      cost: tool.cost,
      hasSchema: tool.hasSchema,
      mcp: {
        compatible: tool.mcpCompatible,
      },
      routePath: `/tools/${tool.id}`,
      memberships,
    });
  }

  const mcpCompatibleTools = tools.filter((tool) => tool.mcpCompatible).length;

  writeJson('manifest.json', {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    lazyLoadingByDesign: true,
    stats: {
      totalSpaces: orderedSpaceSummaries.length,
      totalGroups,
      totalTools: tools.length,
      mcpCompatibleTools,
      mcpIncompatibleTools: tools.length - mcpCompatibleTools,
      pageSizes: {
        spaces: SPACE_PAGE_SIZE,
        groupTools: GROUP_TOOL_PAGE_SIZE,
      },
    },
    resources: {
      spaces: toWebPath('spaces', 'index.json'),
      spaceTemplate: `${WEB_ROOT}/spaces/{spaceId}.json`,
      groupTemplate: `${WEB_ROOT}/groups/{spaceId}/{groupId}/page-1.json`,
      toolTemplate: `${WEB_ROOT}/tools/{toolId}.json`,
    },
  });

  console.log(
    `[mcp-manifest] Generated ${tools.length} tools, ${orderedSpaceSummaries.length} spaces, ${totalGroups} groups in ${OUT_ROOT}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
