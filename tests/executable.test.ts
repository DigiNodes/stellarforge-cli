import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '..');
const builtCliPath = resolve(repositoryRoot, 'dist', 'cli.js');
const packageJsonPath = resolve(repositoryRoot, 'package.json');
const typescriptCliPath = resolve(
  repositoryRoot,
  'node_modules',
  'typescript',
  'bin',
  'tsc',
);

beforeAll(() => {
  execFileSync(
    process.execPath,
    [typescriptCliPath, '-p', 'tsconfig.build.json'],
    {
      cwd: repositoryRoot,
      stdio: 'pipe',
    },
  );
});

function runBuiltCli(args: string[] = []) {
  return spawnSync(process.execPath, [builtCliPath, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
  });
}

describe('StellarForge CLI executable', () => {
  it('maps the stellarforge package bin to the compiled CLI entry point', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      bin?: Record<string, string>;
    };

    expect(packageJson.bin?.stellarforge).toBe('./dist/cli.js');
  });

  it('preserves the Node.js shebang in the built artifact', () => {
    const builtCli = readFileSync(builtCliPath, 'utf8');

    expect(builtCli.startsWith('#!/usr/bin/env node\n')).toBe(true);
  });

  it('starts successfully without arguments', () => {
    const result = runBuiltCli();

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('prints global help successfully', () => {
    const result = runBuiltCli(['--help']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: stellarforge [options]');
    expect(result.stdout).toContain('-h, --help');
  });

  it('rejects an unknown option with actionable output', () => {
    const result = runBuiltCli(['--definitely-unknown']);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('error: unknown option');
    expect(result.stderr).toContain('Usage: stellarforge [options]');
  });

  it('rejects an unknown positional command with actionable output', () => {
    const result = runBuiltCli(['not-a-command']);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('error:');
    expect(result.stderr).toContain('Usage: stellarforge [options]');
  });
});
