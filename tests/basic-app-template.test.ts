import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { createNewCommand } from '../src/commands/new.js';
import { createCapturedTerminalOutput, withTempDirectory } from './helpers/index.js';

function runNpmScript(projectRoot: string, script: string) {
  return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
    cwd: projectRoot,
    encoding: 'utf8',
    shell: false,
  });
}

describe('Basic App template', () => {
  it('generates through the default new command and passes its documented smoke checks', () =>
    withTempDirectory((root) => {
      const captured = createCapturedTerminalOutput();
      const command = createNewCommand({
        cwd: () => root,
        output: captured.output,
      });

      command.parse(['node', 'new', 'demo-app']);

      const projectRoot = join(root, 'demo-app');
      const packageJson = JSON.parse(
        readFileSync(join(projectRoot, 'package.json'), 'utf8'),
      ) as { name: string; dependencies?: unknown; devDependencies?: unknown };

      expect(packageJson.name).toBe('demo-app');
      expect(packageJson.dependencies).toBeUndefined();
      expect(packageJson.devDependencies).toBeUndefined();
      expect(captured.stdoutText()).toContain('Created demo-app from basic-app');

      const check = runNpmScript(projectRoot, 'check');
      expect(check.status, check.stderr).toBe(0);

      const test = runNpmScript(projectRoot, 'test');
      expect(test.status, test.stderr).toBe(0);

      const generatedReadme = readFileSync(join(projectRoot, 'README.md'), 'utf8');
      expect(generatedReadme).toContain('# demo-app');
      expect(generatedReadme).toContain('does not require or generate wallet secret keys');
    }));
});
