import { symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadProjectConfig,
  PROJECT_CONFIG_FILENAME,
  resolveProjectConfig,
} from '../src/config/project.js';
import { ValidationCliError } from '../src/errors/errors.js';
import { withTempDirectory } from './helpers/index.js';

describe('project configuration', () => {
  it('returns undefined when project configuration is missing', () =>
    withTempDirectory((root) => {
      expect(loadProjectConfig(root)).toBeUndefined();
      expect(resolveProjectConfig(root)).toEqual({});
    }));

  it('loads a valid versioned configuration from the project root', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, PROJECT_CONFIG_FILENAME),
        JSON.stringify({
          version: 1,
          network: 'testnet',
          identity: 'deployer',
        }),
      );

      expect(loadProjectConfig(root)).toEqual({
        version: 1,
        network: 'testnet',
        identity: 'deployer',
      });
    }));

  it('applies CLI overrides above project configuration without inventing missing values', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, PROJECT_CONFIG_FILENAME),
        JSON.stringify({
          version: 1,
          network: 'futurenet',
          identity: 'project-deployer',
        }),
      );

      expect(
        resolveProjectConfig(root, {
          network: 'testnet',
          identity: 'cli-deployer',
        }),
      ).toEqual({
        network: 'testnet',
        identity: 'cli-deployer',
      });

      writeFileSync(
        join(root, PROJECT_CONFIG_FILENAME),
        JSON.stringify({ version: 1 }),
      );
      expect(resolveProjectConfig(root)).toEqual({});
    }));

  it('rejects unsupported networks with an actionable error', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, PROJECT_CONFIG_FILENAME),
        JSON.stringify({ version: 1, network: 'local' }),
      );

      expect(() => loadProjectConfig(root)).toThrow(
        'Configuration network must be one of: testnet, futurenet, mainnet.',
      );
    }));

  it('rejects secret-bearing fields without echoing their values', () =>
    withTempDirectory((root) => {
      const secret = 'S-DO-NOT-ECHO-THIS-VALUE';
      writeFileSync(
        join(root, PROJECT_CONFIG_FILENAME),
        JSON.stringify({
          version: 1,
          privateKey: secret,
        }),
      );

      try {
        loadProjectConfig(root);
        throw new Error('Expected configuration validation to fail.');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationCliError);
        expect((error as Error).message).toContain(
          'must not contain secret material',
        );
        expect((error as Error).message).not.toContain(secret);
      }
    }));

  it.each([
    'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  ])('rejects raw Stellar StrKey identity value %j', (identity) =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, PROJECT_CONFIG_FILENAME),
        JSON.stringify({ version: 1, identity }),
      );

      expect(() => loadProjectConfig(root)).toThrow(ValidationCliError);
    }),
  );

  it('rejects a symlinked project configuration', () =>
    withTempDirectory((root) => {
      const target = join(root, 'actual-config.json');
      writeFileSync(target, JSON.stringify({ version: 1, network: 'testnet' }));
      symlinkSync(target, join(root, PROJECT_CONFIG_FILENAME));

      expect(() => loadProjectConfig(root)).toThrow('not a symbolic link');
    }));
});
