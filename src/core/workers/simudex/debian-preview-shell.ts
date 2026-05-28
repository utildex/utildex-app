import type { DebianRuntimeManifest } from '../../sandbox/debian-runtime.contract';
import type { SandboxBootContext } from '../../sandbox/session-backend.contract';
import type { TerminalOutputStream } from '../../sandbox/terminal-session.contract';

export interface DebianPreviewShellOutput {
  stream: TerminalOutputStream;
  text: string;
}

export interface DebianPreviewShellResult {
  cwd: string;
  output: DebianPreviewShellOutput[];
  exit?: boolean;
}

type FilesystemEntry =
  | {
      type: 'dir';
      mode: string;
    }
  | {
      type: 'file';
      mode: string;
      content: string;
    };

const COMMANDS = [
  'assets',
  'cat',
  'cd',
  'clear',
  'cp',
  'date',
  'echo',
  'env',
  'exit',
  'help',
  'hostname',
  'id',
  'ls',
  'mkdir',
  'mv',
  'printenv',
  'pwd',
  'rm',
  'rmdir',
  'sudo',
  'time',
  'touch',
  'uname',
  'whoami',
] as const;

export class DebianPreviewShell {
  private cwd: string;
  private readonly filesystem = new Map<string, FilesystemEntry>();
  private readonly env: Record<string, string>;

  constructor(
    private readonly manifest: DebianRuntimeManifest,
    private readonly bootContext: SandboxBootContext,
    cwd: string,
  ) {
    this.cwd = normalizePath(cwd);
    this.env = {
      HOME: manifest.defaultCwd,
      HOSTNAME: 'simudex-debian',
      LANG: 'C.UTF-8',
      LOGNAME: 'student',
      PATH: '/usr/local/bin:/usr/bin:/bin',
      PWD: this.cwd,
      SHELL: manifest.defaultShell,
      TERM: 'xterm-256color',
      USER: 'student',
    };
    this.seedFilesystem();
  }

  get currentDirectory(): string {
    return this.cwd;
  }

  createWelcomeOutput(): DebianPreviewShellOutput[] {
    return [
      {
        stream: 'system',
        text: `${this.manifest.name} worker session ready in ${this.cwd}.`,
      },
      {
        stream: 'system',
        text: `Runtime ${this.manifest.version}, protocol ${this.manifest.protocolVersion}.`,
      },
      {
        stream: 'system',
        text: 'Local preview shell active. Full Debian VM execution is still waiting for bundled assets.',
      },
      {
        stream: 'system',
        text: 'V1 policy: offline-only, no internet bridge, no remote execution.',
      },
    ];
  }

  run(input: string): DebianPreviewShellResult {
    const tokens = tokenize(input.trim());
    if (tokens.length === 0) {
      return { cwd: this.cwd, output: [] };
    }

    const command = tokens[0];
    const args = tokens.slice(1);
    const output = this.runCommand(command, args);
    this.env.PWD = this.cwd;
    return { cwd: this.cwd, ...output };
  }

  private runCommand(
    command: string,
    args: string[],
  ): Pick<DebianPreviewShellResult, 'output' | 'exit'> {
    if (command === 'help') return this.help();
    if (command === 'pwd') return this.stdout(this.cwd);
    if (command === 'cd') return this.cd(args);
    if (command === 'ls') return this.ls(args);
    if (command === 'cat') return this.cat(args);
    if (command === 'echo') return this.stdout(args.join(' '));
    if (command === 'date') return this.date(args);
    if (command === 'time') return this.time(args);
    if (command === 'whoami') return this.stdout('student');
    if (command === 'id')
      return this.stdout('uid=1000(student) gid=1000(student) groups=1000(student)');
    if (command === 'hostname') return this.stdout('simudex-debian');
    if (command === 'uname') return this.uname(args);
    if (command === 'env' || command === 'printenv') return this.printEnv(args);
    if (command === 'touch') return this.touch(args);
    if (command === 'mkdir') return this.mkdir(args);
    if (command === 'rm') return this.rm(args);
    if (command === 'rmdir') return this.rmdir(args);
    if (command === 'cp') return this.copy(args);
    if (command === 'mv') return this.move(args);
    if (command === 'sudo') return this.sudo(args);
    if (command === 'assets') return this.assets();
    if (command === 'runtime') return this.runtime();
    if (command === 'clear') return this.system('[clear requested]');
    if (command === 'exit') return { output: [], exit: true };

    if (command === 'apt' || command === 'apt-get') {
      return this.stderr('apt: package installation is unavailable in the local preview shell.');
    }

    if (command === 'curl' || command === 'wget' || command === 'ping') {
      return this.stderr(`${command}: network access is disabled in Simudex v1.`);
    }

    return this.stderr(`${command}: command not found`);
  }

  private help(): Pick<DebianPreviewShellResult, 'output'> {
    return this.stdout(`Available preview commands: ${COMMANDS.join(', ')}.`);
  }

  private cd(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    const target = resolvePath(args[0] ?? this.manifest.defaultCwd, this.cwd, this.manifest);
    const entry = this.filesystem.get(target);
    if (!entry) return this.stderr(`cd: ${args[0] ?? target}: No such file or directory`);
    if (entry.type !== 'dir') return this.stderr(`cd: ${args[0] ?? target}: Not a directory`);

    this.cwd = target;
    return this.system(`cwd: ${this.cwd}`);
  }

  private ls(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    const flags = args.filter((arg) => arg.startsWith('-'));
    const targets = args.filter((arg) => !arg.startsWith('-'));
    const showAll = flags.some((flag) => flag.includes('a'));
    const long = flags.some((flag) => flag.includes('l'));
    const path = resolvePath(targets[0] ?? '.', this.cwd, this.manifest);
    const entry = this.filesystem.get(path);

    if (!entry)
      return this.stderr(`ls: cannot access '${targets[0] ?? path}': No such file or directory`);

    if (entry.type === 'file') {
      return this.stdout(
        long
          ? `${entry.mode} 1 student student ${entry.content.length} ${basename(path)}`
          : basename(path),
      );
    }

    const childPaths = this.childrenOf(path, showAll);
    if (long) {
      return this.stdout(
        childPaths
          .map((childPath) => {
            const child = this.filesystem.get(childPath);
            if (!child) return '';
            const size = child.type === 'file' ? child.content.length : 4096;
            return `${child.mode} 1 student student ${size} ${basename(childPath)}`;
          })
          .filter(Boolean)
          .join('\n'),
      );
    }

    return this.stdout(childPaths.map((childPath) => basename(childPath)).join('  '));
  }

  private cat(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.length === 0) return this.stderr('cat: missing file operand');

    const output: DebianPreviewShellOutput[] = [];
    for (const arg of args) {
      const path = resolvePath(arg, this.cwd, this.manifest);
      const entry = this.filesystem.get(path);
      if (!entry) {
        output.push({ stream: 'stderr', text: `cat: ${arg}: No such file or directory` });
      } else if (entry.type === 'dir') {
        output.push({ stream: 'stderr', text: `cat: ${arg}: Is a directory` });
      } else {
        output.push({ stream: 'stdout', text: entry.content.replace(/\n$/, '') });
      }
    }

    return { output };
  }

  private date(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args[0] === '-u') return this.stdout(new Date().toUTCString());
    return this.stdout(new Date().toString());
  }

  private time(args: string[]): Pick<DebianPreviewShellResult, 'output' | 'exit'> {
    if (args.length === 0) {
      return this.stdout('real 0m0.000s\nuser 0m0.000s\nsys 0m0.000s');
    }

    const result = this.runCommand(args[0], args.slice(1));
    return {
      output: [
        ...result.output,
        { stream: 'stderr', text: 'real 0m0.001s\nuser 0m0.000s\nsys 0m0.001s' },
      ],
      exit: result.exit,
    };
  }

  private uname(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.includes('-a')) {
      return this.stdout('Linux simudex-debian 6.1.0-simudex-preview x86_64 GNU/Linux');
    }
    return this.stdout('Linux');
  }

  private printEnv(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.length > 0) {
      const value = this.env[args[0]];
      return value ? this.stdout(value) : { output: [] };
    }

    return this.stdout(
      Object.entries(this.env)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
    );
  }

  private touch(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.length === 0) return this.stderr('touch: missing file operand');

    for (const arg of args) {
      const path = resolvePath(arg, this.cwd, this.manifest);
      const parent = dirname(path);
      if (!this.isDirectory(parent))
        return this.stderr(`touch: cannot touch '${arg}': No such directory`);
      const current = this.filesystem.get(path);
      if (!current) this.filesystem.set(path, { type: 'file', mode: '-rw-r--r--', content: '' });
    }

    return { output: [] };
  }

  private mkdir(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.length === 0) return this.stderr('mkdir: missing operand');
    const recursive = args.includes('-p');
    const targets = args.filter((arg) => arg !== '-p');

    for (const target of targets) {
      const path = resolvePath(target, this.cwd, this.manifest);
      if (this.filesystem.has(path))
        return this.stderr(`mkdir: cannot create directory '${target}': File exists`);
      const parent = dirname(path);
      if (!this.isDirectory(parent)) {
        if (!recursive)
          return this.stderr(
            `mkdir: cannot create directory '${target}': No such file or directory`,
          );
        this.createParents(parent);
      }
      this.filesystem.set(path, { type: 'dir', mode: 'drwxr-xr-x' });
    }

    return { output: [] };
  }

  private rm(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.length === 0) return this.stderr('rm: missing operand');
    const recursive = args.some((arg) => arg === '-r' || arg === '-rf' || arg === '-fr');
    const targets = args.filter((arg) => !arg.startsWith('-'));

    for (const target of targets) {
      const path = resolvePath(target, this.cwd, this.manifest);
      const entry = this.filesystem.get(path);
      if (!entry) return this.stderr(`rm: cannot remove '${target}': No such file or directory`);
      if (entry.type === 'dir' && !recursive)
        return this.stderr(`rm: cannot remove '${target}': Is a directory`);
      this.removePath(path);
    }

    return { output: [] };
  }

  private rmdir(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.length === 0) return this.stderr('rmdir: missing operand');
    for (const target of args) {
      const path = resolvePath(target, this.cwd, this.manifest);
      if (!this.isDirectory(path))
        return this.stderr(`rmdir: failed to remove '${target}': No such directory`);
      if (this.childrenOf(path, false).length > 0)
        return this.stderr(`rmdir: failed to remove '${target}': Directory not empty`);
      this.filesystem.delete(path);
    }
    return { output: [] };
  }

  private copy(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.length < 2) return this.stderr('cp: missing destination file operand');
    const sourcePath = resolvePath(args[0], this.cwd, this.manifest);
    const targetPath = resolvePath(args[1], this.cwd, this.manifest);
    const source = this.filesystem.get(sourcePath);
    if (!source) return this.stderr(`cp: cannot stat '${args[0]}': No such file or directory`);
    if (source.type === 'dir')
      return this.stderr(`cp: -r not implemented for directory '${args[0]}'`);
    if (!this.isDirectory(dirname(targetPath)))
      return this.stderr(`cp: cannot create regular file '${args[1]}': No such directory`);
    this.filesystem.set(targetPath, { ...source });
    return { output: [] };
  }

  private move(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    const copied = this.copy(args);
    if (copied.output.length > 0) return copied;
    this.removePath(resolvePath(args[0], this.cwd, this.manifest));
    return { output: [] };
  }

  private sudo(args: string[]): Pick<DebianPreviewShellResult, 'output'> {
    if (args.length === 0) return this.stderr('sudo: a command is required');
    return this.stderr('sudo: privileged commands are disabled in the local Simudex preview shell');
  }

  private assets(): Pick<DebianPreviewShellResult, 'output'> {
    return this.stdout(
      this.manifest.assets
        .map((asset) => {
          const requirement = asset.required ? 'required' : 'optional';
          return `${asset.kind}:${asset.id} -> ${asset.url} (${requirement})`;
        })
        .join('\n'),
    );
  }

  private runtime(): Pick<DebianPreviewShellResult, 'output'> {
    return this.stdout(
      [
        `${this.manifest.name} (${this.manifest.architecture})`,
        `runtime version: ${this.manifest.version}`,
        `protocol version: ${this.manifest.protocolVersion}`,
        `boot sandbox: ${this.bootContext.sandboxId}`,
        `offline only: ${this.manifest.offlineOnly ? 'yes' : 'no'}`,
        'engine: local preview shell',
      ].join('\n'),
    );
  }

  private stdout(text: string): Pick<DebianPreviewShellResult, 'output'> {
    return { output: text ? [{ stream: 'stdout', text }] : [] };
  }

  private stderr(text: string): Pick<DebianPreviewShellResult, 'output'> {
    return { output: [{ stream: 'stderr', text }] };
  }

  private system(text: string): Pick<DebianPreviewShellResult, 'output'> {
    return { output: [{ stream: 'system', text }] };
  }

  private seedFilesystem(): void {
    this.filesystem.set('/', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/bin', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/dev', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/etc', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/home', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/home/student', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/tmp', { type: 'dir', mode: 'drwxrwxrwt' });
    this.filesystem.set('/usr', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/usr/bin', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/var', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/var/log', { type: 'dir', mode: 'drwxr-xr-x' });
    this.filesystem.set('/etc/debian_version', {
      type: 'file',
      mode: '-rw-r--r--',
      content: '12-simudex-preview\n',
    });
    this.filesystem.set('/etc/os-release', {
      type: 'file',
      mode: '-rw-r--r--',
      content: 'PRETTY_NAME="Debian GNU/Linux - Simudex preview"\nID=debian\n',
    });
    this.filesystem.set('/home/student/README.txt', {
      type: 'file',
      mode: '-rw-r--r--',
      content:
        'Welcome to the Simudex Debian preview shell.\nThis is an offline worker-local shell while the full Debian VM assets are being integrated.\n',
    });
  }

  private childrenOf(path: string, showAll: boolean): string[] {
    const prefix = path === '/' ? '/' : `${path}/`;
    const children = new Set<string>();

    if (showAll) {
      children.add(`${prefix}.`.replace('//', '/'));
      children.add(`${prefix}..`.replace('//', '/'));
    }

    for (const key of this.filesystem.keys()) {
      if (key === path || !key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (!rest || rest.includes('/')) continue;
      children.add(key);
    }

    return Array.from(children).sort((left, right) =>
      basename(left).localeCompare(basename(right)),
    );
  }

  private isDirectory(path: string): boolean {
    return this.filesystem.get(path)?.type === 'dir';
  }

  private createParents(path: string): void {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = `${current}/${part}`;
      if (!this.filesystem.has(current)) {
        this.filesystem.set(current, { type: 'dir', mode: 'drwxr-xr-x' });
      }
    }
  }

  private removePath(path: string): void {
    for (const key of Array.from(this.filesystem.keys())) {
      if (key === path || key.startsWith(`${path}/`)) {
        this.filesystem.delete(key);
      }
    }
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;

  for (const character of input) {
    if (character === "'" && quote !== 'double') {
      quote = quote === 'single' ? null : 'single';
      continue;
    }

    if (character === '"' && quote !== 'single') {
      quote = quote === 'double' ? null : 'double';
      continue;
    }

    if (/\s/.test(character) && !quote) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += character;
  }

  if (current) tokens.push(current);
  return tokens;
}

function resolvePath(path: string, cwd: string, manifest: DebianRuntimeManifest): string {
  if (path === '~') return manifest.defaultCwd;
  if (path.startsWith('~/')) return normalizePath(`${manifest.defaultCwd}/${path.slice(2)}`);
  if (path.startsWith('/')) return normalizePath(path);
  return normalizePath(`${cwd}/${path}`);
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return `/${parts.join('/')}`;
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') return '/';
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '/';
}

function basename(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') return '/';
  return normalized.split('/').filter(Boolean).at(-1) ?? '/';
}
