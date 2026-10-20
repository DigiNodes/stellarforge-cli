import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { createNewCommand } from '../src/commands/new.js';
import { createNpmInvocation } from '../src/process/npm.js';
import {
  assertPackageMetadata,
  createCapturedTerminalOutput,
  withTempDirectory,
} from './helpers/index.js';

// Frozen template contract for Basic App package.json (SW-041).
// Update this object only when the template itself is intentionally changed.
const FROZEN_SCRIPTS = {
  start: 'node src/index.js',
  check: 'node --check src/index.js && node --check src/network.js',
  test: 'node --test',
} as const;

const FROZEN_NODE_ENGINE = '>=22.13.0';

function runNpmScript(projectRoot: string, script: string) {
  const npm = createNpmInvocation(['run', script]);

  return spawnSync(npm.command, [...npm.args], {
    cwd: projectRoot,
    encoding: 'utf8',
    shell: false,
  });
}

describe('Basic App package metadata conformance (SW-041)', () => {
  it('conforms to all frozen package.json metadata constraints', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'my-stellar-app']);

      assertPackageMetadata(
        join(root, 'my-stellar-app', 'package.json'),
        {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        },
      );
    }));

  it('sets the package name to the generated project name', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'my-stellar-app']);

      assertPackageMetadata(
        join(root, 'my-stellar-app', 'package.json'),
        {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        },
      );
    }));

  it('retains all frozen script entries without modification', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'my-stellar-app']);

      assertPackageMetadata(
        join(root, 'my-stellar-app', 'package.json'),
        {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        },
      );
    }));

  it('retains only the frozen script keys and no extras', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'my-stellar-app']);

      assertPackageMetadata(
        join(root, 'my-stellar-app', 'package.json'),
        {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        },
      );
    }));

  it('sets the engines.node constraint to the frozen minimum version', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'my-stellar-app']);

      assertPackageMetadata(
        join(root, 'my-stellar-app', 'package.json'),
        {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        },
      );
    }));

  it('generates no dependencies field', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'my-stellar-app']);

      assertPackageMetadata(
        join(root, 'my-stellar-app', 'package.json'),
        {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        },
      );
    }));

  it('generates no devDependencies field', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'my-stellar-app']);

      assertPackageMetadata(
        join(root, 'my-stellar-app', 'package.json'),
        {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        },
      );
    }));

  it('does not embed secret, seed, or private-key values in the generated package.json', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'my-stellar-app']);

      assertPackageMetadata(
        join(root, 'my-stellar-app', 'package.json'),
        {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        },
      );
    }));

  it(
    'passes the repository check script after generation',
    () =>
      withTempDirectory((root) => {
        const command = createNewCommand({
          cwd: () => root,
          output: createCapturedTerminalOutput().output,
        });

        command.parse(['node', 'new', 'my-stellar-app']);

        const projectRoot = join(root, 'my-stellar-app');

        // Confirm metadata is still conformant, then exercise the check script.
        assertPackageMetadata(join(projectRoot, 'package.json'), {
          name: 'my-stellar-app',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        });

        const result = runNpmScript(projectRoot, 'check');

        expect(result.status, result.stderr).toBe(0);
      }),
    15_000,
  );
});
