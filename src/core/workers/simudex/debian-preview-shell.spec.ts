import { describe, expect, it } from 'vitest';
import { MINIMAL_DEBIAN_RUNTIME_MANIFEST } from '../../sandbox';
import { DebianPreviewShell } from './debian-preview-shell';

function createShell(): DebianPreviewShell {
  return new DebianPreviewShell(
    MINIMAL_DEBIAN_RUNTIME_MANIFEST,
    {
      sandboxId: 'minimal-debian-terminal',
      runtimeVersion: MINIMAL_DEBIAN_RUNTIME_MANIFEST.version,
      offlineOnly: true,
    },
    MINIMAL_DEBIAN_RUNTIME_MANIFEST.defaultCwd,
  );
}

function texts(shell: DebianPreviewShell, command: string): string[] {
  return shell.run(command).output.map((chunk) => chunk.text);
}

describe('DebianPreviewShell', () => {
  it('lists and reads the seeded local filesystem', () => {
    const shell = createShell();

    expect(texts(shell, 'ls')).toEqual(['README.txt']);
    expect(texts(shell, 'cat README.txt').join('\n')).toContain('Simudex Debian preview shell');
    expect(texts(shell, 'cat /etc/debian_version')).toEqual(['12-simudex-preview']);
  });

  it('supports date, time, identity, and runtime inspection commands', () => {
    const shell = createShell();

    expect(texts(shell, 'date')).toHaveLength(1);
    expect(texts(shell, 'time')).toEqual(['real 0m0.000s\nuser 0m0.000s\nsys 0m0.000s']);
    expect(texts(shell, 'whoami')).toEqual(['student']);
    expect(texts(shell, 'uname -a')).toEqual([
      'Linux simudex-debian 6.1.0-simudex-preview x86_64 GNU/Linux',
    ]);
    expect(texts(shell, 'runtime').join('\n')).toContain('engine: local preview shell');
  });

  it('allows simple local filesystem mutation inside the worker session', () => {
    const shell = createShell();

    shell.run('mkdir projects');
    shell.run('cd projects');
    shell.run('touch notes.txt');

    expect(shell.currentDirectory).toBe('/home/student/projects');
    expect(texts(shell, 'ls')).toEqual(['notes.txt']);
    expect(texts(shell, 'rm notes.txt')).toEqual([]);
    expect(texts(shell, 'ls')).toEqual([]);
  });

  it('returns shell-style errors instead of VM bridge placeholders', () => {
    const shell = createShell();

    expect(texts(shell, 'cat')).toEqual(['cat: missing file operand']);
    expect(texts(shell, 'sudo')).toEqual(['sudo: a command is required']);
    expect(texts(shell, 'sudo ls')).toEqual([
      'sudo: privileged commands are disabled in the local Simudex preview shell',
    ]);
    expect(texts(shell, 'does-not-exist')).toEqual(['does-not-exist: command not found']);
  });
});
