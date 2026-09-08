import { describe, expect, it } from 'vitest';
import type { RunCommand } from '../src/diagnostics/process.js';
import { createStellarDiagnostic } from '../src/diagnostics/stellar.js';

function result(
  status: number | null,
  stdout = '',
  stderr = '',
  error?: Error,
) {
  return {
    status,
    stdout,
    stderr,
    ...(error === undefined ? {} : { error }),
  };
}

describe('Stellar CLI diagnostic', () => {
  it('uses the official machine-friendly version command', () => {
    const calls: Array<{ executable: string; args: readonly string[] }> = [];
    const execute: RunCommand = (executable, args) => {
      calls.push({ executable, args });
      return result(0, '27.1.0\n');
    };

    const diagnostic = createStellarDiagnostic(execute).run();

    expect(calls).toEqual([
      { executable: 'stellar', args: ['version', '--only-version'] },
    ]);
    expect(diagnostic.status).toBe('pass');
    expect(diagnostic.message).toContain('27.1.0');
  });

  it('accepts a leading v and newer compatible versions', () => {
    const execute: RunCommand = () => result(0, 'v28.0.0\n');

    const diagnostic = createStellarDiagnostic(execute).run();

    expect(diagnostic.status).toBe('pass');
    expect(diagnostic.message).toContain('28.0.0');
  });

  it('fails versions below the supported Stellar baseline', () => {
    const execute: RunCommand = () => result(0, '27.0.0\n');

    const diagnostic = createStellarDiagnostic(execute).run();

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toContain('27.0.0');
    expect(diagnostic.remediation).toContain('>=27.1.0');
  });

  it('fails when Stellar CLI is unavailable without leaking process details', () => {
    const execute: RunCommand = () =>
      result(
        null,
        '',
        'SECRET_SEED=do-not-render',
        new Error('spawn stellar ENOENT SECRET_SEED=do-not-render'),
      );

    const diagnostic = createStellarDiagnostic(execute).run();

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe(
      'Stellar CLI is unavailable or could not be executed.',
    );
    expect(JSON.stringify(diagnostic)).not.toContain('SECRET_SEED');
  });

  it('fails malformed version output', () => {
    const execute: RunCommand = () => result(0, 'stellar-cli unknown\n');

    const diagnostic = createStellarDiagnostic(execute).run();

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe(
      'Stellar CLI returned an unrecognized version.',
    );
  });
});
