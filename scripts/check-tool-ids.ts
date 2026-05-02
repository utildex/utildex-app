import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

interface ContractLike {
  id: string;
}

interface ModuleRoot {
  label: string;
  dir: string;
}

async function main() {
  const roots: ModuleRoot[] = [
    {
      label: 'utildex-tools',
      dir: path.join(process.cwd(), 'src', 'utildex-tools'),
    },
    {
      label: 'synedex-games',
      dir: path.join(process.cwd(), 'src', 'synedex-games'),
    },
  ];

  const ids: string[] = [];
  const folderIdMismatches: string[] = [];

  for (const root of roots) {
    if (!fs.existsSync(root.dir)) {
      continue;
    }

    const folders = fs
      .readdirSync(root.dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const folder of folders) {
      const indexFile = path.join(root.dir, folder, 'index.ts');
      if (!fs.existsSync(indexFile)) {
        throw new Error(`[tool-ids] Missing module index file (${root.label}): ${indexFile}`);
      }

      const mod = (await import(pathToFileURL(indexFile).href)) as { contract?: ContractLike };
      const id = mod.contract?.id;

      if (!id) {
        throw new Error(`[tool-ids] Missing contract.id in ${indexFile}`);
      }

      if (id !== folder) {
        folderIdMismatches.push(`${root.label}/${folder} -> ${id}`);
      }

      ids.push(id);
    }
  }

  if (folderIdMismatches.length > 0) {
    throw new Error(
      `[tool-ids] Folder/contract id mismatches detected: ${folderIdMismatches.join(', ')}`,
    );
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

  console.log(
    `[tool-ids] OK: ${ids.length} modules validated (unique contract.id + folder name matches contract.id).`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
