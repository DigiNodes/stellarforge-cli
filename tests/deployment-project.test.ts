import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveTestnetDeploymentPlan } from '../src/deployment/project.js';
import { ValidationCliError } from '../src/errors/errors.js';
import { withTempDirectory } from './helpers/index.js';

describe('Testnet deployment plan', () => {
  it('builds a safe Stellar CLI argument array for an explicit Testnet deployment', () =>
    withTempDirectory((root) => {
      writeFileSync(join(root, 'Cargo.toml'), '[workspace]\nmembers = []\n');

      expect(
        resolveTestnetDeploymentPlan({
          cwd: root,
          network: 'testnet',
          source: 'deployer',
        }),
      ).toEqual([
        {
          label: 'stellar:deploy',
          command: process.platform === 'win32' ? 'stellar.exe' : 'stellar',
          args: [
            'contract',
            'deploy',
            '--source-account',
            'deployer',
            '--network',
            'testnet',
          ],
          cwd: root,
        },
      ]);
    }));

  it.each(['mainnet', 'futurenet', 'local', 'TESTNET', '']) (
    'rejects unsupported network %j before side effects',
    (network) =>
      withTempDirectory((root) => {
        writeFileSync(join(root, 'Cargo.toml'), '[workspace]\nmembers = []\n');
        expect(() =>
          resolveTestnetDeploymentPlan({ cwd: root, network, source: 'alice' }),
        ).toThrow('only the explicit `--network testnet`');
      }),
  );

  it.each([
    'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'seed phrase words',
    '../identity',
    'alice/bob',
    '-flag',
  ])('rejects unsafe source value %j', (source) =>
    withTempDirectory((root) => {
      writeFileSync(join(root, 'Cargo.toml'), '[workspace]\nmembers = []\n');
      expect(() =>
        resolveTestnetDeploymentPlan({
          cwd: root,
          network: 'testnet',
          source,
        }),
      ).toThrow(ValidationCliError);
    }));

  it('rejects unsupported project layouts', () =>
    withTempDirectory((root) => {
      expect(() =>
        resolveTestnetDeploymentPlan({
          cwd: root,
          network: 'testnet',
          source: 'alice',
        }),
      ).toThrow('No Cargo.toml workspace was found');
    }));
});
