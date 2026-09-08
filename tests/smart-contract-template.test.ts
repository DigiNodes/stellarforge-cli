import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { createNewCommand } from '../src/commands/new.js';
import {
  createCapturedTerminalOutput,
  withTempDirectory,
} from './helpers/index.js';

describe('Smart Contract template', () => {
  it('generates a valid Cargo workspace with current Stellar contract guidance and no secrets', () =>
    withTempDirectory((root) => {
      const captured = createCapturedTerminalOutput();
      const command = createNewCommand({
        cwd: () => root,
        output: captured.output,
      });

      command.parse([
        'node',
        'new',
        'demo.contract',
        '--template',
        'smart-contract',
      ]);

      const projectRoot = join(root, 'demo.contract');
      const rootManifest = readFileSync(join(projectRoot, 'Cargo.toml'), 'utf8');
      const contractManifest = readFileSync(
        join(projectRoot, 'contracts', 'hello', 'Cargo.toml'),
        'utf8',
      );
      const readme = readFileSync(join(projectRoot, 'README.md'), 'utf8');

      expect(existsSync(join(projectRoot, 'contracts', 'hello', 'src', 'lib.rs'))).toBe(
        true,
      );
      expect(existsSync(join(projectRoot, 'contracts', 'hello', 'src', 'test.rs'))).toBe(
        true,
      );
      expect(rootManifest).toContain('soroban-sdk = "26"');
      expect(rootManifest).toContain('wasm32v1-none').toBe(false);
      expect(contractManifest).toContain(
        'name = "stellarforge-starter-contract"',
      );
      expect(contractManifest).not.toContain('demo.contract');
      expect(readme).toContain('# demo.contract');
      expect(readme).toContain('stellar contract build');
      expect(readme).toContain('stellar contract deploy');
      expect(readme).toContain('stellar contract invoke');
      expect(readme).toContain('--network testnet');
      expect(readme).not.toMatch(/S[A-Z0-9]{55}/);
      expect(captured.stdoutText()).toContain(
        'Created demo.contract from smart-contract',
      );

      const metadata = spawnSync(
        'cargo',
        ['metadata', '--no-deps', '--format-version=1'],
        {
          cwd: projectRoot,
          encoding: 'utf8',
          shell: false,
        },
      );

      expect(metadata.status, metadata.stderr).toBe(0);
      expect(metadata.stdout).toContain('stellarforge-starter-contract');
    }));
});
