import { createHash } from 'node:crypto';
import {
  appendFileSync,
  createReadStream,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

type Options = {
  sandbox: string;
  runtime: string;
  artifact: string;
  version: string;
  file: string;
  metadata: string;
  publicBaseUrl: string;
  keyPrefix: string;
  outFile: string;
};

type JsonObject = Record<string, unknown>;

type RootfsArtifactManifest = {
  schemaVersion: 1;
  sandbox: string;
  runtime: string;
  artifact: string;
  version: string;
  publishedAt: string;
  source: {
    repository: string | null;
    ref: string | null;
    commit: string | null;
    runId: string | null;
    runAttempt: string | null;
  };
  rootfs: {
    key: string;
    url: string;
    metadataKey: string;
    metadataUrl: string;
    manifestKey: string;
    manifestUrl: string;
    sizeBytes: number;
    sha256: string;
    revision: string | null;
  };
};

const defaults: Options = {
  sandbox: 'simudex',
  runtime: 'debian',
  artifact: 'rootfs',
  version: '',
  file: 'sandbox-images/simudex/debian/rootfs.ext2',
  metadata: 'sandbox-images/simudex/debian/rootfs.meta.json',
  publicBaseUrl: 'https://runtime.simudex.org',
  keyPrefix: 'sandboxes',
  outFile: '.tmp-r2-artifacts/simudex-debian-rootfs-manifest.json',
};

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const opts = { ...defaults };

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];

    if (!value) throw new Error(`Missing value for ${key}`);

    if (key === '--sandbox') opts.sandbox = value;
    else if (key === '--runtime') opts.runtime = value;
    else if (key === '--artifact') opts.artifact = value;
    else if (key === '--version') opts.version = value;
    else if (key === '--file') opts.file = value;
    else if (key === '--metadata') opts.metadata = value;
    else if (key === '--public-base-url') opts.publicBaseUrl = value;
    else if (key === '--key-prefix') opts.keyPrefix = value;
    else if (key === '--out-file') opts.outFile = value;
    else throw new Error(`Unknown option: ${key}`);
  }

  return opts;
}

function requireIdentifier(name: string, value: string): string {
  const normalized = value.trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`${name} must use lowercase letters, numbers, and dashes`);
  }
  return normalized;
}

function requireVersion(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
    throw new Error(
      '--version must be a stable identifier using letters, numbers, dots, dashes, or underscores',
    );
  }
  return normalized;
}

function readJsonObject(filePath: string): JsonObject {
  const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON object`);
  }
  return parsed as JsonObject;
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(normalized)) {
    throw new Error('--public-base-url must be an HTTPS URL');
  }
  return normalized;
}

function joinUrl(baseUrl: string, key: string): string {
  return `${baseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function writeGithubOutput(name: string, value: string): void {
  const outputPath = process.env['GITHUB_OUTPUT'];
  if (!outputPath) return;
  appendFileSync(outputPath, `${name}=${value.replace(/\r?\n/g, '%0A')}\n`);
}

function getNullableEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);

  return new Promise((resolveHash, rejectHash) => {
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('error', rejectHash);
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
}

const opts = parseArgs();
const sandbox = requireIdentifier('--sandbox', opts.sandbox);
const runtime = requireIdentifier('--runtime', opts.runtime);
const artifact = requireIdentifier('--artifact', opts.artifact);
const version = requireVersion(opts.version);
const publicBaseUrl = normalizeBaseUrl(opts.publicBaseUrl);
const keyPrefix = opts.keyPrefix
  .split('/')
  .filter(Boolean)
  .map((part) => requireIdentifier('--key-prefix', part))
  .join('/');

const artifactPath = resolve(opts.file);
const metadataPath = resolve(opts.metadata);
const outFile = resolve(opts.outFile);
const rootfsMetadata = readJsonObject(metadataPath);
const revision = typeof rootfsMetadata['revision'] === 'string' ? rootfsMetadata['revision'] : null;
const sizeBytes = statSync(artifactPath).size;
const sha256 = await sha256File(artifactPath);

const objectPrefix = `${keyPrefix}/${sandbox}/${runtime}/${artifact}`;
const versionPrefix = `${objectPrefix}/${version}`;
const rootfsKey = `${versionPrefix}/rootfs.ext2`;
const metadataKey = `${versionPrefix}/rootfs.meta.json`;
const manifestKey = `${versionPrefix}/manifest.json`;
const latestKey = `${objectPrefix}/latest.json`;
const publishedAt = new Date().toISOString();

const manifest: RootfsArtifactManifest = {
  schemaVersion: 1,
  sandbox,
  runtime,
  artifact,
  version,
  publishedAt,
  source: {
    repository: getNullableEnv('GITHUB_REPOSITORY'),
    ref: getNullableEnv('GITHUB_REF_NAME') ?? getNullableEnv('GITHUB_REF'),
    commit: getNullableEnv('GITHUB_SHA'),
    runId: getNullableEnv('GITHUB_RUN_ID'),
    runAttempt: getNullableEnv('GITHUB_RUN_ATTEMPT'),
  },
  rootfs: {
    key: rootfsKey,
    url: joinUrl(publicBaseUrl, rootfsKey),
    metadataKey,
    metadataUrl: joinUrl(publicBaseUrl, metadataKey),
    manifestKey,
    manifestUrl: joinUrl(publicBaseUrl, manifestKey),
    sizeBytes,
    sha256,
    revision,
  },
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`);

writeGithubOutput('artifact_file', artifactPath);
writeGithubOutput('metadata_file', metadataPath);
writeGithubOutput('manifest_file', outFile);
writeGithubOutput('artifact_key', rootfsKey);
writeGithubOutput('metadata_key', metadataKey);
writeGithubOutput('manifest_key', manifestKey);
writeGithubOutput('latest_key', latestKey);
writeGithubOutput('sha256', sha256);
writeGithubOutput('size_bytes', String(sizeBytes));

console.log(`Prepared ${sandbox}/${runtime}/${artifact} ${version}`);
console.log(`Rootfs: ${rootfsKey}`);
console.log(`SHA-256: ${sha256}`);
console.log(`Manifest: ${outFile}`);
