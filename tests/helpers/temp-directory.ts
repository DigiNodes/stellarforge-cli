import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TempDirectoryFixture {
  readonly path: string;
  cleanup(): void;
}

export function createTempDirectoryFixture(
  prefix = 'stellarforge-test-',
): TempDirectoryFixture {
  const path = mkdtempSync(join(tmpdir(), prefix));
  let cleaned = false;

  return {
    path,
    cleanup() {
      if (cleaned) {
        return;
      }

      rmSync(path, { recursive: true, force: true });
      cleaned = true;
    },
  };
}

export async function withTempDirectory<T>(
  action: (path: string) => T | Promise<T>,
): Promise<T> {
  const fixture = createTempDirectoryFixture();

  try {
    return await action(fixture.path);
  } finally {
    fixture.cleanup();
  }
}
