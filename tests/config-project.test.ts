import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadProjectConfig,
  PROJECT_CONFIG_FILENAME,
  resolveProjectConfig,
} from '../src/config/project.js';
import { ValidationCliError } from '../src/errors/errors.js';
import { withTempDirectory } from './helpers/index.js';

function writeConfig(root: string, value: unknown): void {
  writeFileSync(join(root, PROJECT_CONFIG_FILENAME), JSON.stringify(value));
}

describe('project configuration', () => {
  it('loads a valid versioned project configuration', () =>
    withTempDirectory((root) => {
      writeConfig(root, {
        version: 1,
        network: 'testnet',
        identity: 'deployer',
      });

      expect(loadProjectConfig(root)).toEqual({
        version: 1,
        network: 'testnet',
        identity: 'deployer',
      });
    }));

  it('returns undefined when project configuration is missing', () =>
    withTempDirectory((root) => {
      expect(loadProjectConfig(root)).toBeUndefined();
      expect(resolveProjectConfig(root)).toEqual({});
    }));

  it('applies CLI overrides above project configuration', () =>
    withTempDirectory((root) => {
      writeConfig(root, {
        version: 1,
        network: 'futurenet',
        identity: 'configured',
      });

      expect(
        resolveProjectConfig(root, {
          network: 'testnet',
          identity: 'cli-identity',
        }),
      ).toEqual({
        network: 'testnet',
        identity: 'cli-identity',
      });
    }));

  it.each([
    {},
    { version: 2 },
    { version: 1, network: 'local' },
    { version: 1, identity: '../identity' },
    { version: 1, extra: true },
  ])('rejects invalid configuration', (value) =>
    withTempDirectory((root) => {
      writeConfig(root, value);
      expect(() => loadProjectConfig(root)).toThrow(ValidationCliError);
    }));

  it.each(['secret', 'privateKey', 'seed_phrase', 'password', 'token'])(
    'rejects secret-bearing field %s without echoing its value',
    (field) =>
      withTempDirectory((root) => {
        writeConfig(root, {
          version: 1,
          [field]: 'DO_NOT_ECHO_THIS_VALUE',
        });

        try {
          loadProjectConfig(root);
          throw new Error('expected configuration validation to fail');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationCliError);
          expect((error as Error).message).not.toContain(
            'DO_NOT_ECHO_THIS_VALUE',
          );
        }
      }),
  );

  it('rejects raw Stellar StrKeys as identity configuration', () =>
    withTempDirectory((root) => {
      writeConfig(root, {
        version: 1,
        identity: 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      });

      expect(() => loadProjectConfig(root)).toThrow(ValidationCliError);
    }));

  it('rejects malformed JSON without echoing file contents', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, PROJECT_CONFIG_FILENAME),
        '{"version":1,"secret":"DO_NOT_ECHO"',
      );

      try {
        loadProjectConfig(root);
        throw new Error('expected parsing to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationCliError);
        expect((error as Error).message).toContain('not valid JSON');
        expect((error as Error).message).not.toContain('DO_NOT_ECHO');
      }
    }));

  it('rejects symbolic-link configuration', () =>
    withTempDirectory((root) => {
      const target = join(root, 'actual-config.json');
      writeFileSync(target, '{"version":1}');
      symlinkSync(target, join(root, PROJECT_CONFIG_FILENAME));

      expect(() => loadProjectConfig(root)).toThrow('symbolic link');
    }));

  it('rejects configuration larger than the MVP size limit', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, PROJECT_CONFIG_FILENAME),
        JSON.stringify({
          version: 1,
          padding: 'x'.repeat(70 * 1024),
        }),
      );

      expect(() => loadProjectConfig(root)).toThrow('64 KiB');
    }));

  it('rejects a directory at the project configuration path', () =>
    withTempDirectory((root) => {
      mkdirSync(join(root, PROJECT_CONFIG_FILENAME));
      expect(() => loadProjectConfig(root)).toThrow('regular project file');
    }));
});
