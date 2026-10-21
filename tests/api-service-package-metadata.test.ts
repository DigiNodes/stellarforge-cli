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

// Frozen template contract for API Service package.json (SW-043).
// Update this object only when the template itself is intentionally changed.
const FROZEN_SCRIPTS = {
  start: 'node src/start.js',
  check:
    'node --check src/config.js && node --check src/stellar-client.js && node --check src/server.js && node --check src/start.js',
  test: 'node --test test/*.test.js',
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

describe('API Service package metadata conformance (SW-043)', () => {
  it('conforms to all frozen package.json metadata constraints', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      assertPackageMetadata(join(root, 'demo-api', 'package.json'), {
        name: 'demo-api',
        scripts: FROZEN_SCRIPTS,
        nodeEngine: FROZEN_NODE_ENGINE,
      });
    }));

  it('sets the package name to the generated project name', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      assertPackageMetadata(join(root, 'demo-api', 'package.json'), {
        name: 'demo-api',
        scripts: FROZEN_SCRIPTS,
        nodeEngine: FROZEN_NODE_ENGINE,
      });
    }));

  it('retains all frozen script entries without modification', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      assertPackageMetadata(join(root, 'demo-api', 'package.json'), {
        name: 'demo-api',
        scripts: FROZEN_SCRIPTS,
        nodeEngine: FROZEN_NODE_ENGINE,
      });
    }));

  it('retains only the frozen script keys and no extras', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      assertPackageMetadata(join(root, 'demo-api', 'package.json'), {
        name: 'demo-api',
        scripts: FROZEN_SCRIPTS,
        nodeEngine: FROZEN_NODE_ENGINE,
      });
    }));

  it('sets the engines.node constraint to the frozen minimum version', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      assertPackageMetadata(join(root, 'demo-api', 'package.json'), {
        name: 'demo-api',
        scripts: FROZEN_SCRIPTS,
        nodeEngine: FROZEN_NODE_ENGINE,
      });
    }));

  it('generates no dependencies field', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      assertPackageMetadata(join(root, 'demo-api', 'package.json'), {
        name: 'demo-api',
        scripts: FROZEN_SCRIPTS,
        nodeEngine: FROZEN_NODE_ENGINE,
      });
    }));

  it('generates no devDependencies field', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      assertPackageMetadata(join(root, 'demo-api', 'package.json'), {
        name: 'demo-api',
        scripts: FROZEN_SCRIPTS,
        nodeEngine: FROZEN_NODE_ENGINE,
      });
    }));

  it('does not embed secret, seed, or private-key values in the generated package.json', () =>
    withTempDirectory((root) => {
      const command = createNewCommand({
        cwd: () => root,
        output: createCapturedTerminalOutput().output,
      });

      command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

      assertPackageMetadata(join(root, 'demo-api', 'package.json'), {
        name: 'demo-api',
        scripts: FROZEN_SCRIPTS,
        nodeEngine: FROZEN_NODE_ENGINE,
      });
    }));

  it(
    'passes the repository check script after generation',
    () =>
      withTempDirectory((root) => {
        const command = createNewCommand({
          cwd: () => root,
          output: createCapturedTerminalOutput().output,
        });

        command.parse(['node', 'new', 'demo-api', '--template', 'api-service']);

        const projectRoot = join(root, 'demo-api');

        assertPackageMetadata(join(projectRoot, 'package.json'), {
          name: 'demo-api',
          scripts: FROZEN_SCRIPTS,
          nodeEngine: FROZEN_NODE_ENGINE,
        });

        const result = runNpmScript(projectRoot, 'check');

        expect(result.status, result.stderr).toBe(0);
      }),
    15_000,
  );
});
