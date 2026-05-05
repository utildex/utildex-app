
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

// 1. Import Shared Data
import { LANGUAGES } from '../src/data/languages';
import { type AppId, resolvePublicBaseUrl } from '../src/core/app.config';

interface ToolContractLike {
  id: string;
  metadata: {
    appName?: 'utildex' | 'synedex' | 'shared';
    categories: string[];
  };
}

interface ArticleLike {
  id: string;
  date: string;
  appName?: 'utildex' | 'synedex' | 'shared';
}

interface ToolSpaceLike {
  id: string;
  appName?: 'utildex' | 'synedex' | 'shared';
}

// 2. Parse --app=<appId> from CLI arguments (defaults to 'utildex')
function parseAppIdFromArgs(): AppId {
  const appArg = process.argv.find((arg) => arg.startsWith('--app='));
  if (appArg) {
    const value = appArg.split('=')[1];
    if (value === 'utildex' || value === 'synedex') return value;
    console.warn(`[sitemap] Unknown app id "${value}", defaulting to "utildex".`);
  }
  return 'utildex';
}

// Load the correct APP_CONFIG_DATA for the target app
async function loadAppConfig(appId: AppId) {
  const configFileName = appId === 'synedex' ? 'app.config.synedex.ts' : 'app.config.ts';
  const configPath = path.join(process.cwd(), configFileName);
  const mod = (await import(pathToFileURL(configPath).href)) as {
    APP_CONFIG_DATA: { hosting: { defaultPublicBaseUrl: string } };
  };
  return mod.APP_CONFIG_DATA;
}

// Load the correct article registry for the target app
async function loadArticleRegistry(appId: AppId): Promise<ArticleLike[]> {
  const registryFileName =
    appId === 'synedex'
      ? 'src/data/article-registry.synedex.ts'
      : 'src/data/article-registry.ts';
  const registryPath = path.join(process.cwd(), registryFileName);
  const mod = (await import(pathToFileURL(registryPath).href)) as {
    ARTICLE_REGISTRY: ArticleLike[];
  };
  return mod.ARTICLE_REGISTRY;
}

// Load the correct tool space registry for the target app
async function loadToolSpaceRegistry(appId: AppId): Promise<ToolSpaceLike[]> {
  const registryFileName =
    appId === 'synedex'
      ? 'src/data/tool-space-registry.synedex.ts'
      : 'src/data/tool-space-registry.ts';
  const registryPath = path.join(process.cwd(), registryFileName);
  const mod = (await import(pathToFileURL(registryPath).href)) as {
    TOOL_SPACES_REGISTRY: ToolSpaceLike[];
  };
  return mod.TOOL_SPACES_REGISTRY.filter((space) => {
    const owner = space.appName ?? appId;
    return owner === 'shared' || owner === appId;
  });
}

// 3. Helper to format XML
const getUrlEntry = (
  loc: string,
  lastmod?: string,
  changefreq: string = 'weekly',
  priority: number = 0.5,
) => `
  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;

// 4. Generator
async function generateSitemap() {
  const ACTIVE_APP_ID = parseAppIdFromArgs();
  console.log(`[sitemap] Generating sitemap for "${ACTIVE_APP_ID}"...`);

  const appConfig = await loadAppConfig(ACTIVE_APP_ID);
  const BASE_URL = resolvePublicBaseUrl({
    envBaseUrl: process.env.SITEMAP_BASE_URL || process.env.APP_BASE_URL,
    runtimeOrigin: appConfig.hosting.defaultPublicBaseUrl,
  });

  const toolContracts = await loadToolContracts(ACTIVE_APP_ID);
  const articles = await loadArticleRegistry(ACTIVE_APP_ID);
  const spaces = await loadToolSpaceRegistry(ACTIVE_APP_ID);

  const hasTools = toolContracts.length > 0;
  const hasArticles = articles.length > 0;
  const hasCategories = toolContracts.some((t) => t.metadata.categories.length > 0);
  const hasSpaces = spaces.length > 0;

  const urls: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  // The path segment for the tools/games index page differs per app
  const gamesIndexPath = ACTIVE_APP_ID === 'synedex' ? 'games' : 'tools';

  // A. Static Pages — conditionally include sections based on whether the app has content
  LANGUAGES.forEach((lang) => {
    const code = lang.code;

    // Landing Page — always present
    urls.push(getUrlEntry(`${BASE_URL}/${code}`, today, 'daily', 1.0));

    // Tools/Games index — only if there are registered tools/games
    if (hasTools) {
      urls.push(getUrlEntry(`${BASE_URL}/${code}/${gamesIndexPath}`, today, 'daily', 0.9));
    }

    // Spaces index — only if there are registered spaces
    if (hasSpaces) {
      urls.push(getUrlEntry(`${BASE_URL}/${code}/spaces`, today, 'weekly', 0.8));
    }

    // Articles index — only if there are registered articles for this app
    if (hasArticles) {
      urls.push(getUrlEntry(`${BASE_URL}/${code}/articles`, today, 'weekly', 0.8));
    }

    // Categories index — only if there are tools with categories
    if (hasCategories) {
      urls.push(getUrlEntry(`${BASE_URL}/${code}/categories`, today, 'weekly', 0.8));
    }

    // Legal Pages — always present (shared across apps)
    urls.push(getUrlEntry(`${BASE_URL}/${code}/legal`, today, 'monthly', 0.5));
    urls.push(getUrlEntry(`${BASE_URL}/${code}/privacy`, today, 'monthly', 0.5));
    urls.push(getUrlEntry(`${BASE_URL}/${code}/terms`, today, 'monthly', 0.5));
  });

  // B. Individual Tool/Game pages — path segment differs per app ('tools' for Utildex, 'games' for Synedex)
  const gamePath = ACTIVE_APP_ID === 'synedex' ? 'games' : 'tools';
  toolContracts.forEach((tool) => {
    LANGUAGES.forEach((lang) => {
      urls.push(getUrlEntry(`${BASE_URL}/${lang.code}/${gamePath}/${tool.id}`, today, 'weekly', 0.8));
    });
  });

  // C. Individual Article pages — only from this app's registry
  articles.forEach((article) => {
    LANGUAGES.forEach((lang) => {
      urls.push(
        getUrlEntry(
          `${BASE_URL}/${lang.code}/articles/${article.id}`,
          article.date,
          'monthly',
          0.7,
        ),
      );
    });
  });

  // D. Category pages — derived from this app's tools only
  if (hasCategories) {
    const categories = new Set<string>();
    toolContracts.forEach((tool) => tool.metadata.categories.forEach((c) => categories.add(c)));
    categories.forEach((cat) => {
      const catSlug = encodeURIComponent(cat);
      LANGUAGES.forEach((lang) => {
        urls.push(
          getUrlEntry(`${BASE_URL}/${lang.code}/categories/${catSlug}`, today, 'weekly', 0.6),
        );
      });
    });
  }

  // E. Space pages — only from this app's space registry
  spaces.forEach((space) => {
    const spaceSlug = encodeURIComponent(space.id);
    LANGUAGES.forEach((lang) => {
      urls.push(
        getUrlEntry(`${BASE_URL}/${lang.code}/spaces/${spaceSlug}`, today, 'weekly', 0.7),
      );
    });
  });

  // 5. Write File
  const OUT_DIR = path.join(process.cwd(), 'src', 'seo', ACTIVE_APP_ID);
  const OUT_FILE = path.join(OUT_DIR, 'sitemap.xml');

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`;

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUT_FILE, sitemapContent);
  console.log(`[sitemap] Generated ${OUT_FILE} (${urls.length} URLs)`);
}

async function loadToolContracts(appId: AppId): Promise<ToolContractLike[]> {
  const toolDirs: string[] = [];

  if (appId === 'utildex') {
    toolDirs.push(path.join(process.cwd(), 'src', 'utildex-tools'));
  } else if (appId === 'synedex') {
    toolDirs.push(path.join(process.cwd(), 'src', 'synedex-games'));
  }

  const contracts: ToolContractLike[] = [];

  for (const toolsDir of toolDirs) {
    if (!fs.existsSync(toolsDir)) {
      console.warn(`[sitemap] Tool directory not found: ${toolsDir}, skipping.`);
      continue;
    }

    const toolFolders = fs
      .readdirSync(toolsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const loaded = await Promise.all(
      toolFolders.map(async (folder) => {
        const indexFile = path.join(toolsDir, folder, 'index.ts');
        if (!fs.existsSync(indexFile)) {
          console.warn(`[sitemap] Missing tool index: ${indexFile}, skipping.`);
          return null;
        }

        const mod = (await import(pathToFileURL(indexFile).href)) as {
          contract?: ToolContractLike;
        };

        if (!mod.contract?.id) {
          console.warn(`[sitemap] Missing contract export in ${indexFile}, skipping.`);
          return null;
        }

        return mod.contract;
      }),
    );

    contracts.push(...loaded.filter((c): c is ToolContractLike => c !== null));
  }

  return contracts
    .filter((contract) => {
      const owner = contract.metadata.appName ?? appId;
      return owner === 'shared' || owner === appId;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

generateSitemap().catch(console.error);
