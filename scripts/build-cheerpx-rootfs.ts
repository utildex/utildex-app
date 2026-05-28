import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Options = {
  project: string;
  output: string;
  base: string;
  size: string;
  packages: string;
};

const defaults: Options = {
  project: 'simudex-debian',
  output: 'simudex/debian',
  base: 'docker.io/i386/debian:bookworm',
  size: '600M',
  packages: [
    'bash',
    'coreutils',
    'findutils',
    'grep',
    'sed',
    'gawk',
    'less',
    'nano',
    'vim',
    'sudo',
    'tree',
    'file',
    'tar',
    'gzip',
    'unzip',
    'bzip2',
    'xz-utils',
    'curl',
    'wget',
    'ca-certificates',
    'git',
    'python3',
  ].join(' '),
};

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const opts = { ...defaults };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    if (!value) throw new Error(`Missing value for ${key}`);

    if (key === '--project') opts.project = value;
    else if (key === '--output') opts.output = value;
    else if (key === '--base') opts.base = value;
    else if (key === '--size') opts.size = value;
    else if (key === '--packages') opts.packages = value;
    else throw new Error(`Unknown option: ${key}`);
  }

  if (!opts.output.trim()) {
    throw new Error('--output must not be empty');
  }

  return opts;
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function runBestEffort(command: string, args: string[]) {
  spawnSync(command, args, {
    stdio: 'ignore',
    shell: false,
  });
}

function toDockerSafeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const opts = parseArgs();
const outputParts = opts.output.split(/[\\/]+/).filter(Boolean);
const outputRel = outputParts.join('/');
if (outputParts.length === 0) {
  throw new Error('--output must resolve to at least one folder under src/assets');
}

const root = process.cwd();
const mountRoot = root.replace(/\\/g, '/');
const tmpDir = resolve(root, '.tmp-cheerpx-rootfs');
const outDir = resolve(root, 'src', 'assets', ...outputParts);
const rootfsTar = resolve(tmpDir, 'rootfs.tar');
const rootfsPath = resolve(outDir, 'rootfs.ext2');
const metadataPath = resolve(outDir, 'rootfs.meta.json');

const namePart = toDockerSafeName(opts.project || outputRel || 'simudex-debian');
const imageTag = `cheerpx-${namePart}`;
const containerName = `cheerpx-${namePart}-container`;

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const dockerfile = `
FROM --platform=i386 ${opts.base}

ARG DEBIAN_FRONTEND=noninteractive

RUN useradd -m student && echo "student:student" | chpasswd
RUN echo "root:root" | chpasswd

RUN apt-get update && apt-get install -y --no-install-recommends \\
  ${opts.packages} \\
  && apt-get clean \\
  && rm -rf /var/lib/apt/lists/*

WORKDIR /home/student
CMD ["/bin/bash"]
`.trim();

writeFileSync(resolve(tmpDir, 'Dockerfile'), dockerfile);

run('docker', [
  'buildx',
  'build',
  '--platform',
  'linux/386',
  '-f',
  resolve(tmpDir, 'Dockerfile'),
  '-t',
  imageTag,
  '--load',
  tmpDir,
]);

runBestEffort('docker', ['rm', '-f', containerName]);
run('docker', ['create', '--name', containerName, imageTag]);
run('docker', ['export', '-o', rootfsTar, containerName]);

run('docker', [
  'run',
  '--rm',
  '-v',
  `${mountRoot}:/work`,
  'debian:bookworm',
  'sh',
  '-lc',
  [
    'apt-get update',
    'apt-get install -y --no-install-recommends e2fsprogs tar',
    'rm -rf /tmp/cheerpx-rootfs',
    'mkdir -p /tmp/cheerpx-rootfs',
    'tar -xf /work/.tmp-cheerpx-rootfs/rootfs.tar -C /tmp/cheerpx-rootfs',
    `mkfs.ext2 -b 4096 -d /tmp/cheerpx-rootfs /work/src/assets/${outputRel}/rootfs.ext2 ${opts.size}`,
  ].join(' && '),
]);

runBestEffort('docker', ['rm', '-f', containerName]);

const rootfsStat = statSync(rootfsPath);
const metadata = {
  revision: new Date().toISOString(),
  sizeBytes: rootfsStat.size,
  builtAt: new Date().toISOString(),
  imageTag,
  base: opts.base,
  packageList: opts.packages.split(/\s+/).filter(Boolean),
};
writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

rmSync(tmpDir, { recursive: true, force: true });

console.log('');
console.log(`Created: src/assets/${outputRel}/rootfs.ext2`);
console.log(`Created: src/assets/${outputRel}/rootfs.meta.json`);
console.log(`Revision: ${metadata.revision}`);
