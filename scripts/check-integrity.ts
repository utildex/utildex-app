
import * as fs from 'fs';
import * as path from 'path';

function getKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], `${prefix}${key}.`));
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

async function validateI18nDir(dir: string, context: string): Promise<boolean> {
  const languages = ['en', 'fr', 'es', 'zh'];
  const files = languages.map(lang => path.join(dir, `${lang}.ts`));
  const missingFiles = files.filter(f => !fs.existsSync(f));

  if (missingFiles.length > 0) {
    console.error(`[ERROR] [${context}] Missing language files: ${missingFiles.map(f => path.basename(f)).join(', ')}`);
    return false;
  }

  try {
    const contents: Record<string, any> = {};
    for (const lang of languages) {
      const modulePath = path.resolve(dir, `${lang}.ts`);
      const mod = await import(`file://${modulePath}`);
      contents[lang] = mod.default || mod;
    }

    const enKeys = new Set(getKeys(contents['en']));
    let valid = true;

    for (const lang of languages) {
      if (lang === 'en') continue;
      const langKeys = new Set(getKeys(contents[lang]));
      
      const missing = [...enKeys].filter(k => !langKeys.has(k));
      if (missing.length > 0) {
        console.error(`[ERROR] [${context}] ${lang} is missing keys: ${missing.join(', ')}`);
        valid = false;
      }

      const extra = [...langKeys].filter(k => !enKeys.has(k));
      if (extra.length > 0) {
        console.warn(`[WARNING] [${context}] ${lang} has extra keys: ${extra.join(', ')}`);
      }
    }

    return valid;

  } catch (err) {
    console.error(`[ERROR] [${context}] Failed to load or parse files:`, err);
    return false;
  }
}


async function main() {
  console.log('Starting Integrity Check...');
  let success = true;

  // 1. Global I18n
  console.log('Checking Global I18n...');
  const globalI18nDir = path.join(process.cwd(), 'src', 'i18n');
  if (!await validateI18nDir(globalI18nDir, 'Global')) {
    success = false;
  }

  // 2. Tools I18n
  console.log('Checking Tools I18n...');
  const toolsDir = path.join(process.cwd(), 'src', 'tools');
  if (fs.existsSync(toolsDir)) {
    const tools = fs.readdirSync(toolsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const tool of tools) {
      const i18nDir = path.join(toolsDir, tool, 'i18n');
      if (fs.existsSync(i18nDir)) {
         if (!await validateI18nDir(i18nDir, `Tool: ${tool}`)) {
           success = false;
         }
      } else {
        console.warn(`[WARNING] Tool ${tool} has no i18n folder.`);
      }
    }
  }

  if (!success) {
    console.error('[ERROR] Integrity check failed.');
    process.exit(1);
  } else {
    console.log('[SUCCESS] Integrity check passed!');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
