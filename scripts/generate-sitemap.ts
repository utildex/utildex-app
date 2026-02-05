
import * as fs from 'fs';
import * as path from 'path';

// 1. Import Data
// Note: We access these via relative paths from /scripts/ to /src/
import languages from '../src/data/languages.json';
import { TOOL_REGISTRY } from '../src/data/tool-registry';
import { ARTICLE_REGISTRY } from '../src/data/article-registry';

// 2. Configuration
const BASE_URL = 'https://utildex.com';
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
  console.log('🗺️  Generating Sitemap...');

  const urls: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  // A. Static Pages (Home, Tools List, Articles List, Categories)
  // We generate one for each language
  languages.forEach(lang => {
      const code = lang.code;
      // Landing Page
      urls.push(getUrlEntry(`${BASE_URL}/${code}`, today, 'daily', 1.0));
      // Tools Index
      urls.push(getUrlEntry(`${BASE_URL}/${code}/tools`, today, 'daily', 0.9));
      // Articles Index
      urls.push(getUrlEntry(`${BASE_URL}/${code}/articles`, today, 'weekly', 0.8));
      // Categories Index
      urls.push(getUrlEntry(`${BASE_URL}/${code}/categories`, today, 'weekly', 0.8));
  });

  // B. Tools
  TOOL_REGISTRY.forEach(tool => {
     languages.forEach(lang => {
        urls.push(getUrlEntry(`${BASE_URL}/${lang.code}/tools/${tool.id}`, today, 'weekly', 0.8));
     });
  });

  // C. Articles
  ARTICLE_REGISTRY.forEach(article => {
    languages.forEach(lang => {
       urls.push(getUrlEntry(`${BASE_URL}/${lang.code}/articles/${article.id}`, article.date, 'monthly', 0.7));
    });
 });

 // D. Categories (Derived from Tools)
 const categories = new Set<string>();
 TOOL_REGISTRY.forEach(tool => tool.categories.forEach(c => categories.add(c)));
 
 categories.forEach(cat => {
    // Encoded category name
    const catSlug = encodeURIComponent(cat);
    languages.forEach(lang => {
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
  console.log(`✅ Sitemap generated at ${OUT_FILE} (${urls.length} URLs)`);
}

generateSitemap().catch(console.error);
