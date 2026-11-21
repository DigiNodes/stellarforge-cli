/**
 * Project config filesystem boundary policy (WS-CONFIG).
 *
 * The config file is non-secret by design, so POSIX mode bits and ownership
 * are not trust signals. These tests pin the portable policy instead:
 * exact-path regular files only, explicit symlink rejection, content-free
 * errors when a file cannot be read, and no permission changes by the CLI.
 */
import type * as NodeFs from 'node:fs';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadProjectConfig,
  PROJECT_CONFIG_FILENAME,
} from '../src/config/project.js';
import { ValidationCliError } from '../src/errors/index.js';
import {
  createTempDirectoryFixture,
  withTempDirectory,
} from './helpers/index.js';

const fsProbe = vi.hoisted(() => ({
  failOpenWith: null as NodeJS.ErrnoException | null,
  failReadWith: null as NodeJS.ErrnoException | null,
  secondLstatIsSymlink: false,
  lstatCalls: 0,
  chmodCalls: [] as unknown[][],
  mutateStats: null as null | ((stats: NodeFs.Stats) => NodeFs.Stats),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>();

  function withStatsOverride(stats: NodeFs.Stats): NodeFs.Stats {
    return fsProbe.mutateStats ? fsProbe.mutateStats(stats) : stats;
  }

  function symlinkStats(stats: NodeFs.Stats): NodeFs.Stats {
    const fake = Object.create(Object.getPrototypeOf(stats)) as NodeFs.Stats;
    Object.assign(fake, stats);
    Object.defineProperty(fake, 'isSymbolicLink', { value: () => true });
    Object.defineProperty(fake, 'isFile', { value: () => false });
    return fake;
  }

  return {
    ...actual,
    lstatSync: ((...args: Parameters<typeof actual.lstatSync>) => {
      const stats = actual.lstatSync(...args) as NodeFs.Stats;

      if (String(args[0]).endsWith('stellarforge.config.json')) {
        fsProbe.lstatCalls += 1;

        // Simulates a link substituted between the first inspection and the
        // post-open check without depending on OS symlink privileges.
        if (fsProbe.lstatCalls === 2 && fsProbe.secondLstatIsSymlink) {
          return symlinkStats(stats);
        }
      }

      return withStatsOverride(stats);
    }) as typeof actual.lstatSync,
    fstatSync: ((...args: Parameters<typeof actual.fstatSync>) =>
      withStatsOverride(
        actual.fstatSync(...args) as NodeFs.Stats,
      )) as typeof actual.fstatSync,
    openSync: ((...args: Parameters<typeof actual.openSync>) => {
      if (fsProbe.failOpenWith) {
        throw fsProbe.failOpenWith;
      }
      return actual.openSync(...args);
    }) as typeof actual.openSync,
    readFileSync: ((...args: Parameters<typeof actual.readFileSync>) => {
      if (fsProbe.failReadWith) {
        throw fsProbe.failReadWith;
      }
      return actual.readFileSync(...args);
    }) as typeof actual.readFileSync,
    chmodSync: ((...args: Parameters<typeof actual.chmodSync>) => {
      fsProbe.chmodCalls.push(args);
      return actual.chmodSync(...args);
    }) as typeof actual.chmodSync,
  };
});

function canCreateSymlink(): boolean {
  const fixture = createTempDirectoryFixture();
  try {
    const target = join(fixture.path, 'target');
    writeFileSync(target, 'link-target');
    symlinkSync(target, join(fixture.path, 'link'));
    return true;
  } catch {
    return false;
  } finally {
    fixture.cleanup();
  }
}

const symlinksSupported = canCreateSymlink();
const ORIGINAL_PLATFORM = process.platform;

function onPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

function permissionDenied(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error('permission denied'), { code });
}

function permissiveStats(stats: NodeFs.Stats): NodeFs.Stats {
  const clone = Object.create(Object.getPrototypeOf(stats)) as NodeFs.Stats;
  // Keep the file-type bits so the clone is still a regular file; only the
  // permission bits and ownership become deliberately permissive/foreign.
  return Object.assign(clone, stats, {
    mode: (stats.mode & ~0o7777) | 0o777,
    uid: 0,
    gid: 0,
  });
}

afterEach(() => {
  Object.defineProperty(process, 'platform', {
    value: ORIGINAL_PLATFORM,
    configurable: true,
  });
  fsProbe.failOpenWith = null;
  fsProbe.failReadWith = null;
  fsProbe.secondLstatIsSymlink = false;
  fsProbe.lstatCalls = 0;
  fsProbe.chmodCalls.length = 0;
  fsProbe.mutateStats = null;
});

function writeValidConfig(root: string, name = PROJECT_CONFIG_FILENAME): void {
  writeFileSync(
    join(root, name),
    JSON.stringify({ version: 1, network: 'testnet' }),
  );
}

describe('configuration filesystem boundaries', () => {
  it('loads only the exact project-root configuration filename', () =>
    withTempDirectory((root) => {
      writeValidConfig(root);

      expect(loadProjectConfig(root)).toEqual({
        version: 1,
        network: 'testnet',
      });
    }));

  it.each([
    'config.json',
    '.stellarforge.config.json',
    'stellarforge.config.json.bak',
    'stellarforge.config.jsonc',
  ])('ignores a differently named file %j', (name) =>
    withTempDirectory((root) => {
      writeValidConfig(root, name);

      expect(loadProjectConfig(root)).toBeUndefined();
    }),
  );

  it('ignores a configuration file outside the project root', () =>
    withTempDirectory((root) => {
      const nested = join(root, 'nested');
      mkdirSync(nested);
      writeValidConfig(nested);

      expect(loadProjectConfig(root)).toBeUndefined();
    }));

  it('rejects a directory in place of the configuration file', () =>
    withTempDirectory((root) => {
      mkdirSync(join(root, PROJECT_CONFIG_FILENAME));

      expect(() => loadProjectConfig(root)).toThrow(ValidationCliError);
      expect(() => loadProjectConfig(root)).toThrow(
        'must be a regular project file',
      );
    }));

  it.skipIf(!symlinksSupported)('rejects a symlinked configuration file', () =>
    withTempDirectory((root) => {
      const target = join(root, 'actual-config.json');
      writeFileSync(target, JSON.stringify({ version: 1, network: 'testnet' }));
      symlinkSync(target, join(root, PROJECT_CONFIG_FILENAME));

      expect(() => loadProjectConfig(root)).toThrow('not a symbolic link');
    }),
  );

  it.skipIf(!symlinksSupported)(
    'rejects a directory symlink in place of the configuration file',
    () =>
      withTempDirectory((root) => {
        const target = join(root, 'config-dir');
        mkdirSync(target);
        symlinkSync(target, join(root, PROJECT_CONFIG_FILENAME), 'junction');

        expect(() => loadProjectConfig(root)).toThrow('not a symbolic link');
      }),
  );

  it.skipIf(!symlinksSupported)(
    'treats a dangling symlink as a missing configuration',
    () =>
      withTempDirectory((root) => {
        symlinkSync(
          join(root, 'missing-target.json'),
          join(root, PROJECT_CONFIG_FILENAME),
        );

        expect(loadProjectConfig(root)).toBeUndefined();
      }),
  );

  it.skipIf(!symlinksSupported)(
    'does not read a symlink whose target is outside the project root',
    () =>
      withTempDirectory((root) => {
        const outside = join(root, 'outside');
        mkdirSync(outside);
        const target = join(outside, 'config.json');
        writeFileSync(
          target,
          JSON.stringify({ version: 1, network: 'mainnet' }),
        );
        symlinkSync(target, join(root, PROJECT_CONFIG_FILENAME));

        const thrown = captureError(() => loadProjectConfig(root));

        expect(thrown).toBeInstanceOf(ValidationCliError);
        expect((thrown as Error).message).toBe(
          'stellarforge.config.json must be a regular project file, not a symbolic link.',
        );
        expect((thrown as Error).message).not.toContain(target);
        expect((thrown as Error).message).not.toContain('mainnet');
      }),
  );

  it('rejects an ELOOP raised when the path is opened', () =>
    withTempDirectory((root) => {
      writeValidConfig(root);
      fsProbe.failOpenWith = permissionDenied('ELOOP');

      const thrown = captureError(() => loadProjectConfig(root));

      expect(thrown).toBeInstanceOf(ValidationCliError);
      expect((thrown as Error).message).toBe(
        'stellarforge.config.json must be a regular project file, not a symbolic link.',
      );
    }));

  it('rejects when the path becomes a symlink after the file is opened', () =>
    withTempDirectory((root) => {
      writeValidConfig(root);
      fsProbe.secondLstatIsSymlink = true;

      const thrown = captureError(() => loadProjectConfig(root));

      expect(thrown).toBeInstanceOf(ValidationCliError);
      expect((thrown as Error).message).toContain('not a symbolic link');
    }));

  it.each([
    {
      stage: 'opened',
      fail: () => (fsProbe.failOpenWith = permissionDenied('EACCES')),
    },
    {
      stage: 'read',
      fail: () => (fsProbe.failReadWith = permissionDenied('EACCES')),
    },
  ])(
    'reports a content-free error when the file cannot be $stage',
    ({ fail }) =>
      withTempDirectory((root) => {
        writeValidConfig(root);
        fail();

        const thrown = captureError(() => loadProjectConfig(root));

        expect(thrown).toBeInstanceOf(ValidationCliError);
        expect((thrown as Error).message).toBe(
          'Unable to inspect stellarforge.config.json.',
        );
        expect((thrown as Error).message).not.toContain(root);
        expect((thrown as Error).message).not.toContain('EACCES');
      }),
  );

  describe.each([
    { platform: 'win32', label: 'Windows' },
    { platform: 'linux', label: 'POSIX' },
  ] as const)('portable permission policy on $label', ({ platform }) => {
    it('accepts permissive modes and foreign ownership without changing permissions', () =>
      withTempDirectory((root) => {
        onPlatform(platform);
        writeValidConfig(root);
        fsProbe.mutateStats = permissiveStats;

        expect(loadProjectConfig(root)).toEqual({
          version: 1,
          network: 'testnet',
        });
        expect(fsProbe.chmodCalls).toEqual([]);
      }));

    it('reports the same content-free error for an unreadable file', () =>
      withTempDirectory((root) => {
        onPlatform(platform);
        writeValidConfig(root);
        fsProbe.failReadWith = permissionDenied('EACCES');

        const thrown = captureError(() => loadProjectConfig(root));

        expect(thrown).toBeInstanceOf(ValidationCliError);
        expect((thrown as Error).message).toBe(
          'Unable to inspect stellarforge.config.json.',
        );
        expect(fsProbe.chmodCalls).toEqual([]);
      }));
  });
});
