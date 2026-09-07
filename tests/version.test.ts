import { describe, expect, it } from 'vitest';
import {
  CliVersionResolutionError,
  resolveCliVersion,
} from '../src/version.js';

describe('CLI version resolution', () => {
  it('returns the package metadata version', () => {
    expect(resolveCliVersion(() => ({ version: '1.2.3' }))).toBe('1.2.3');
  });

  it.each([{}, { version: '' }, { version: '   ' }, { version: 123 }, null])(
    'rejects invalid package metadata: %j',
    (metadata) => {
      expect(() => resolveCliVersion(() => metadata)).toThrow(
        CliVersionResolutionError,
      );
    },
  );

  it('wraps package metadata loading failures predictably', () => {
    const cause = new Error('package metadata unavailable');

    try {
      resolveCliVersion(() => {
        throw cause;
      });
      throw new Error('Expected version resolution to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(CliVersionResolutionError);
      expect((error as CliVersionResolutionError).cause).toBe(cause);
    }
  });
});
