import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { withTempDirectory } from './helpers/index.js';

const repositoryRoot = resolve(import.meta.dirname, '..');
const eslintCliPath = resolve(
  repositoryRoot,
  'node_modules',
  'eslint',
  'bin',
  'eslint.js',
);
const prettierCliPath = resolve(
  repositoryRoot,
  'node_modules',
  'prettier',
  'bin',
  'prettier.cjs',
);
const typescriptCliPath = resolve(
  repositoryRoot,
  'node_modules',
  'typescript',
  'bin',
  'tsc',
);
const eslintConfigPath = resolve(repositoryRoot, 'eslint.config.js');
const tsconfigPath = resolve(repositoryRoot, 'tsconfig.json');

function runLocalTool(binaryPath: string, args: string[]) {
  return spawnSync(process.execPath, [binaryPath, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
  });
}

describe('static quality enforcement', () => {
  it('rejects a lint violation with the repository ESLint configuration', async () => {
    await withTempDirectory((directory) => {
      const fixturePath = join(directory, 'bad-lint.js');
      writeFileSync(fixturePath, 'const unused = 1;\n');

      const result = runLocalTool(eslintCliPath, [
        '--config',
        eslintConfigPath,
        fixturePath,
      ]);

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('no-unused-vars');
    });
  });

  it(
    'rejects a formatting violation with the repository Prettier configuration',
    async () => {
      await withTempDirectory((directory) => {
        const fixturePath = join(directory, 'bad-format.ts');
        writeFileSync(fixturePath, 'const value={answer:42}\n');

        const result = runLocalTool(prettierCliPath, [
          '--check',
          '--config',
          resolve(repositoryRoot, '.prettierrc'),
          fixturePath,
        ]);

        expect(result.status).not.toBe(0);
        expect(`${result.stdout}${result.stderr}`).toContain(
          'Code style issues found',
        );
      });
    },
  );

  it('rejects a type violation with strict repository compiler options', async () => {
    await withTempDirectory((directory) => {
      const fixturePath = join(directory, 'bad-types.ts');
      const fixtureConfigPath = join(directory, 'tsconfig.json');

      writeFileSync(fixturePath, "const count: number = 'not-a-number';\n");
      writeFileSync(
        fixtureConfigPath,
        JSON.stringify({
          extends: tsconfigPath,
          compilerOptions: {
            types: [],
            noEmit: true,
          },
          include: ['./bad-types.ts'],
        }),
      );

      const result = runLocalTool(typescriptCliPath, ['-p', fixtureConfigPath]);

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('TS2322');
    });
  });
});
