import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { withTempDirectory } from './helpers/index.js';

const CLI_COMMAND = process.platform === 'win32' ? 'stellarforge.cmd' : 'stellarforge';

function runCli(
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  return spawnSync(CLI_COMMAND, args, {
    cwd,
    env,
    encoding: 'utf8',
    shell: false,
    timeout: 30_000,
  });
}

function expectSuccessful(result: ReturnType<typeof runCli>): void {
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
}

describe('linked CLI MVP end-to-end smoke path', () => {
  it('exercises the built linked executable through generation, testing, and mocked Testnet deployment', () =>
    withTempDirectory((root) => {
      const help = runCli(['--help'], root);
      expectSuccessful(help);
      expect(help.stdout).toContain('Usage: stellarforge [options] [command]');

      const version = runCli(['--version'], root);
      expectSuccessful(version);
      const packageJson = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
      ) as { version: string };
      expect(version.stdout.trim()).toBe(packageJson.version);

      const doctor = runCli(['doctor'], root);
      expect(doctor.error).toBeUndefined();
      expect([0, 5]).toContain(doctor.status);
      expect(doctor.stdout).toContain('Summary:');
      expect(doctor.stdout).not.toContain('SECRET_');

      const createBasic = runCli(
        ['new', 'smoke-basic', '--template', 'basic-app'],
        root,
      );
      expectSuccessful(createBasic);

      const basicRoot = join(root, 'smoke-basic');
      expect(existsSync(join(basicRoot, 'package.json'))).toBe(true);
      expect(existsSync(join(basicRoot, 'src', 'index.js'))).toBe(true);

      const basicTest = runCli(['test'], basicRoot);
      expectSuccessful(basicTest);
      expect(basicTest.stdout).toContain('Running 1 project test workflow.');

      const createContract = runCli(
        ['new', 'smoke-contract', '--template', 'smart-contract'],
        root,
      );
      expectSuccessful(createContract);

      const contractRoot = join(root, 'smoke-contract');
      expect(existsSync(join(contractRoot, 'Cargo.toml'))).toBe(true);

      writeFileSync(
        join(contractRoot, 'stellarforge.config.json'),
        JSON.stringify({
          version: 1,
          network: 'testnet',
          identity: 'ci-deployer',
        }),
      );

      const fakeBin = join(root, 'fake-bin');
      mkdirSync(fakeBin);

      if (process.platform === 'win32') {
        writeFileSync(
          join(fakeBin, 'stellar.exe'),
          'This test workflow currently runs on Linux only.\n',
        );
      } else {
        const fakeStellar = join(fakeBin, 'stellar');
        writeFileSync(
          fakeStellar,
          [
            '#!/usr/bin/env sh',
            'set -eu',
            'expected="contract deploy --source-account ci-deployer --network testnet"',
            'actual="$*"',
            'if [ "$actual" != "$expected" ]; then',
            '  echo "unexpected stellar args" >&2',
            '  exit 64',
            'fi',
            'echo "CFAKECONTRACTID"',
            '',
          ].join('\n'),
        );
        chmodSync(fakeStellar, 0o755);
      }

      const deployEnv = {
        ...process.env,
        PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ''}`,
      };
      const deploy = runCli(['deploy'], contractRoot, deployEnv);
      expectSuccessful(deploy);
      expect(deploy.stdout).toContain('Deploying smart contract to Stellar Testnet.');
      expect(deploy.stdout).toContain('CFAKECONTRACTID');
      expect(deploy.stdout).not.toContain('SECRET');
    }));
});
