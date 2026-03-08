import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

interface ContractLike {
  id: string;
}

async function main() {
  const toolsDir = path.join(process.cwd(), 'src', 'tools');
  const folders = fs
    .readdirSync(toolsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const ids: string[] = [];

  for (const folder of folders) {
    const indexFile = path.join(toolsDir, folder, 'index.ts');
    if (!fs.existsSync(indexFile)) {
      throw new Error(`[tool-ids] Missing tool index file: ${indexFile}`);
    }

    const mod = (await import(pathToFileURL(indexFile).href)) as { contract?: ContractLike };
    const id = mod.contract?.id;

    if (!id) {
      throw new Error(`[tool-ids] Missing contract.id in ${indexFile}`);
    }

    ids.push(id);
  }

  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }

  if (duplicates.size > 0) {
    throw new Error(`[tool-ids] Duplicate tool ids detected: ${Array.from(duplicates).join(', ')}`);
  }

  console.log(`[tool-ids] OK: ${ids.length} unique tool ids.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
