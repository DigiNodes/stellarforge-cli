import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { createNewCommand } from '../src/commands/new.js';
import {
  createCapturedTerminalOutput,
  withTempDirectory,
} from './helpers/index.js';

function runNpmScript(projectRoot: string, script: string) {
  return spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', script],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      shell: false,
    },
  );
}

describe('Full Stack template', () => {
  it('generates the documented frontend, backend, and contracts boundaries and passes smoke checks', () =>
    withTempDirectory((root) => {
      const captured = createCapturedTerminalOutput();
      const command = createNewCommand({
        cwd: () => root,
        output: captured.output,
      });

      command.parse(['node', 'new', 'demo-stack', '--template', 'full-stack']);

      const projectRoot = join(root, 'demo-stack');
      expect(existsSync(join(projectRoot, 'frontend', 'src', 'app.js'))).toBe(
        true,
      );
      expect(existsSync(join(projectRoot, 'backend', 'src', 'server.js'))).toBe(
        true,
      );
      expect(existsSync(join(projectRoot, 'contracts', 'README.md'))).toBe(
        true,
      );
      expect(captured.stdoutText()).toContain(
        'Created demo-stack from full-stack',
      );

      const environmentExample = readFileSync(
        join(projectRoot, '.env.example'),
        'utf8',
      );
      expect(environmentExample).toContain('STELLAR_NETWORK=TESTNET');
      expect(environmentExample).not.toMatch(/SECRET|SEED|PRIVATE_KEY/);

      const check = runNpmScript(projectRoot, 'check');
      expect(check.status, check.stderr).toBe(0);

      const test = runNpmScript(projectRoot, 'test');
      expect(test.status, test.stderr).toBe(0);

      const generatedReadme = readFileSync(
        join(projectRoot, 'README.md'),
        'utf8',
      );
      expect(generatedReadme).toContain('frontend/');
      expect(generatedReadme).toContain('backend/');
      expect(generatedReadme).toContain('contracts/');
      expect(generatedReadme).toContain('no credentials');
    }));
});
