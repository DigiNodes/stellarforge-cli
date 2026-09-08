import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('API Service template', () => {
  it('generates a runnable dependency-light service with isolated Stellar configuration', () =>
    withTempDirectory((root) => {
      const captured = createCapturedTerminalOutput();
      const command = createNewCommand({
        cwd: () => root,
        output: captured.output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      const projectRoot = join(root, 'demo-api');
      expect(existsSync(join(projectRoot, 'src', 'server.js'))).toBe(true);
      expect(existsSync(join(projectRoot, 'src', 'stellar-client.js'))).toBe(
        true,
      );
      expect(existsSync(join(projectRoot, 'test', 'server.test.js'))).toBe(
        true,
      );
      expect(captured.stdoutText()).toContain(
        'Created demo-api from api-service',
      );

      const packageManifest = readFileSync(
        join(projectRoot, 'package.json'),
        'utf8',
      );
      expect(packageManifest).toContain('"name": "demo-api"');
      expect(packageManifest).not.toContain('dependencies');

      const environmentExample = readFileSync(
        join(projectRoot, '.env.example'),
        'utf8',
      );
      expect(environmentExample).toContain('STELLAR_NETWORK=TESTNET');
      expect(environmentExample).toContain('STELLAR_HORIZON_URL=https://');
      expect(environmentExample).toContain('STELLAR_RPC_URL=https://');
      expect(environmentExample).not.toMatch(/SECRET|SEED|PRIVATE_KEY/);

      const check = runNpmScript(projectRoot, 'check');
      expect(check.status, check.stderr).toBe(0);

      const test = runNpmScript(projectRoot, 'test');
      expect(test.status, test.stderr).toBe(0);

      const generatedReadme = readFileSync(
        join(projectRoot, 'README.md'),
        'utf8',
      );
      expect(generatedReadme).toContain('GET /health');
      expect(generatedReadme).toContain('src/stellar-client.js');
      expect(generatedReadme).toContain('Never commit secret keys');
      expect(generatedReadme).toContain('official Stellar documentation');
    }));
});
