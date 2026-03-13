
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

// 1. Import Data
// Note: We access these via relative paths from /scripts/ to /src/
import { LANGUAGES } from '../src/data/languages';
import { ARTICLE_REGISTRY } from '../src/data/article-registry';
import { resolvePublicBaseUrl } from '../src/core/app.config';

interface ToolContractLike {
  id: string;
  metadata: {
    categories: string[];
  };
}

// 2. Configuration
const BASE_URL = resolvePublicBaseUrl({
  envBaseUrl: process.env.SITEMAP_BASE_URL || process.env.APP_BASE_URL,
});
const OUT_DIR = path.join(process.cwd(), 'src');
const OUT_FILE = path.join(OUT_DIR, 'sitemap.xml');

// 3. Helper to format XML
const getUrlEntry = (loc: string, lastmod?: string, changefreq: string = 'weekly', priority: number = 0.5) => `
  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;

// 4. Generator
async function generateSitemap() {
  console.log('[sitemap] Generating sitemap...');

  const toolContracts = await loadToolContracts();

  const urls: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  // A. Static Pages (Home, Tools List, Articles List, Categories)
  // We generate one for each language
  LANGUAGES.forEach((lang) => {
    const code = lang.code;
    // Landing Page
    urls.push(getUrlEntry(`${BASE_URL}/${code}`, today, 'daily', 1.0));
    // Tools Index
    urls.push(getUrlEntry(`${BASE_URL}/${code}/tools`, today, 'daily', 0.9));
    // Articles Index
    urls.push(getUrlEntry(`${BASE_URL}/${code}/articles`, today, 'weekly', 0.8));
    // Categories Index
    urls.push(getUrlEntry(`${BASE_URL}/${code}/categories`, today, 'weekly', 0.8));
    // Legal Pages
    urls.push(getUrlEntry(`${BASE_URL}/${code}/legal`, today, 'monthly', 0.5));
    urls.push(getUrlEntry(`${BASE_URL}/${code}/privacy`, today, 'monthly', 0.5));
    urls.push(getUrlEntry(`${BASE_URL}/${code}/terms`, today, 'monthly', 0.5));
  });

  // B. Tools
  toolContracts.forEach((tool) => {
    LANGUAGES.forEach((lang) => {
      urls.push(getUrlEntry(`${BASE_URL}/${lang.code}/tools/${tool.id}`, today, 'weekly', 0.8));
    });
  });

  // C. Articles
  ARTICLE_REGISTRY.forEach((article) => {
    LANGUAGES.forEach((lang) => {
      urls.push(
        getUrlEntry(`${BASE_URL}/${lang.code}/articles/${article.id}`, article.date, 'monthly', 0.7),
      );
    });
  });

  // D. Categories (Derived from Tools)
  const categories = new Set<string>();
  toolContracts.forEach((tool) => tool.metadata.categories.forEach((c) => categories.add(c)));

  categories.forEach((cat) => {
    // Encoded category name
    const catSlug = encodeURIComponent(cat);
    LANGUAGES.forEach((lang) => {
      urls.push(getUrlEntry(`${BASE_URL}/${lang.code}/categories/${catSlug}`, today, 'weekly', 0.6));
    });
  });


  // 5. Write File
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

async function loadToolContracts(): Promise<ToolContractLike[]> {
  const toolsDir = path.join(process.cwd(), 'src', 'tools');
  const toolFolders = fs
    .readdirSync(toolsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const contracts = await Promise.all(
    toolFolders.map(async (folder) => {
      const indexFile = path.join(toolsDir, folder, 'index.ts');
      if (!fs.existsSync(indexFile)) {
        throw new Error(`[sitemap] Missing tool index: ${indexFile}`);
      }

      const mod = (await import(pathToFileURL(indexFile).href)) as {
        contract?: ToolContractLike;
      };

      if (!mod.contract?.id) {
        throw new Error(`[sitemap] Missing contract export in ${indexFile}`);
      }

      return mod.contract;
    }),
  );

  return contracts.sort((a, b) => a.id.localeCompare(b.id));
}

generateSitemap().catch(console.error);
