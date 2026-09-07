import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCapturedTerminalOutput } from './helpers/captured-output.js';
import {
  createTempDirectoryFixture,
  withTempDirectory,
} from './helpers/temp-directory.js';

describe('test infrastructure', () => {
  it('creates isolated temp directories and cleans them idempotently', () => {
    const first = createTempDirectoryFixture();
    const second = createTempDirectoryFixture();

    expect(first.path).not.toBe(second.path);
    expect(existsSync(first.path)).toBe(true);
    expect(existsSync(second.path)).toBe(true);

    first.cleanup();
    first.cleanup();
    second.cleanup();

    expect(existsSync(first.path)).toBe(false);
    expect(existsSync(second.path)).toBe(false);
  });

  it('cleans a temp directory when a fixture action throws', async () => {
    let fixturePath = '';

    await expect(
      withTempDirectory((path) => {
        fixturePath = path;
        writeFileSync(join(path, 'fixture.txt'), 'isolated');
        throw new Error('expected fixture failure');
      }),
    ).rejects.toThrow('expected fixture failure');

    expect(fixturePath).not.toBe('');
    expect(existsSync(fixturePath)).toBe(false);
  });

  it('captures stdout and stderr without replacing global process streams', () => {
    const captured = createCapturedTerminalOutput();

    captured.output.info('info');
    captured.output.error('error');

    expect(captured.stdout).toEqual(['info\n']);
    expect(captured.stderr).toEqual(['error\n']);
    expect(captured.stdoutText()).toBe('info\n');
    expect(captured.stderrText()).toBe('error\n');
  });
});
