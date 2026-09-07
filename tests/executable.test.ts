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

  it('starts successfully without producing command output yet', () => {
    const result = spawnSync(process.execPath, [builtCliPath], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: false,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });
});
