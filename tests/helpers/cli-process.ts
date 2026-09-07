import {
  execFileSync,
  spawnSync,
  type SpawnSyncReturns,
} from 'node:child_process';
import { resolve } from 'node:path';

export const repositoryRoot = resolve(import.meta.dirname, '..', '..');
export const builtCliPath = resolve(repositoryRoot, 'dist', 'cli.js');

const typescriptCliPath = resolve(
  repositoryRoot,
  'node_modules',
  'typescript',
  'bin',
  'tsc',
);

export function buildCli(): void {
  execFileSync(
    process.execPath,
    [typescriptCliPath, '-p', 'tsconfig.build.json'],
    {
      cwd: repositoryRoot,
      stdio: 'pipe',
    },
  );
}

export function runBuiltCli(
  args: string[] = [],
  cwd = repositoryRoot,
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [builtCliPath, ...args], {
    cwd,
    encoding: 'utf8',
    shell: false,
  });
}
