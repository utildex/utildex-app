import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type Args = {
  force: boolean;
};

const OUTPUT_REL_DIR = 'src/assets/simudex/debian/cheerpx';
const ROOT_OUTPUT_REL_DIR = 'src/assets/simudex/debian/cheerpx/root';
const ENTRY_FILE = 'cx.esm.js';
const CHEERPX_PACKAGE_JSON = 'node_modules/@leaningtech/cheerpx/package.json';
const IMPORT_SPECIFIER_REGEX = /from\s+['"]\.\/([^'"]+)['"]/g;
const COMPANION_RUNTIME_FILES = [
  'cheerpOS.js',
  'workerclock.js',
  'cxcore.js',
  'cxcore.wasm',
  'cxcore-no-return-call.js',
  'cxcore-no-return-call.wasm',
  'tun/direct.js',
  'tun/tailscale_tun_auto.js',
  'tun/tailscale_tun.js',
  'tun/wasm_exec.js',
  'tun/ipstack.js',
  'tun/tailscale.wasm',
];

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  return {
    force: argv.includes('--force'),
  };
}

function readInstalledCheerpXVersion(root: string): string {
  const packagePath = resolve(root, CHEERPX_PACKAGE_JSON);
  if (!existsSync(packagePath)) {
    throw new Error('CheerpX package is not installed. Run "npm ci" first.');
  }

  const raw = readFileSync(packagePath, 'utf8');
  const json = JSON.parse(raw) as { version?: unknown };
  if (typeof json.version !== 'string' || !json.version.trim()) {
    throw new Error('Unable to read @leaningtech/cheerpx version from node_modules.');
  }

  return json.version.trim();
}

async function downloadCheerpXFile(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/javascript,text/javascript,*/*;q=0.1',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download CheerpX runtime file (${response.status} ${response.statusText}) from ${url}`,
    );
  }

  const body = Buffer.from(await response.arrayBuffer());
  if (body.length === 0) {
    throw new Error(`Downloaded CheerpX runtime file from ${url} is empty.`);
  }

  return body;
}

async function ensureRuntimeFile(
  sourceUrl: string,
  outputPath: string,
  displayPath: string,
  force: boolean,
): Promise<Buffer> {
  if (existsSync(outputPath) && !force) {
    console.log(`[cheerpx-sync] Already present: ${displayPath}`);
    return readFileSync(outputPath);
  }

  const body = await downloadCheerpXFile(sourceUrl);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, body);
  console.log(`[cheerpx-sync] Downloaded ${sourceUrl}`);
  console.log(`[cheerpx-sync] Wrote ${displayPath}`);
  return body;
}

function mirrorRuntimeFile(body: Buffer, outputPath: string, displayPath: string, force: boolean) {
  if (existsSync(outputPath) && !force) {
    console.log(`[cheerpx-sync] Already present: ${displayPath}`);
    return;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, body);
  console.log(`[cheerpx-sync] Wrote ${displayPath}`);
}

function getRelativeImports(source: string): string[] {
  const imports = new Set<string>();
  for (const match of source.matchAll(IMPORT_SPECIFIER_REGEX)) {
    imports.add(match[1]);
  }
  return Array.from(imports);
}

async function main() {
  const args = parseArgs();
  const root = process.cwd();
  const outputDir = resolve(root, OUTPUT_REL_DIR);
  const entryOutputPath = resolve(outputDir, ENTRY_FILE);
  const rootOutputDir = resolve(root, ROOT_OUTPUT_REL_DIR);

  const version = readInstalledCheerpXVersion(root);
  const sourceBaseUrl = `https://cxrtnc.leaningtech.com/${version}`;
  const entrySourceUrl = `${sourceBaseUrl}/${ENTRY_FILE}`;
  const entryBody = await ensureRuntimeFile(
    entrySourceUrl,
    entryOutputPath,
    `${OUTPUT_REL_DIR}/${ENTRY_FILE}`,
    args.force,
  );
  const relativeImports = getRelativeImports(entryBody.toString('utf8'));

  for (const fileName of relativeImports) {
    const sourceUrl = `${sourceBaseUrl}/${fileName}`;
    const outputPath = resolve(outputDir, fileName);
    await ensureRuntimeFile(sourceUrl, outputPath, `${OUTPUT_REL_DIR}/${fileName}`, args.force);
  }

  for (const fileName of COMPANION_RUNTIME_FILES) {
    const sourceUrl = `${sourceBaseUrl}/${fileName}`;
    const assetOutputPath = resolve(outputDir, fileName);
    const rootOutputPath = resolve(rootOutputDir, fileName);
    const body = await ensureRuntimeFile(
      sourceUrl,
      assetOutputPath,
      `${OUTPUT_REL_DIR}/${fileName}`,
      args.force,
    );
    mirrorRuntimeFile(body, rootOutputPath, `${ROOT_OUTPUT_REL_DIR}/${fileName}`, args.force);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
