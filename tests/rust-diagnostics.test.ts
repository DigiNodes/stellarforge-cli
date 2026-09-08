import { describe, expect, it } from 'vitest';
import {
  createCargoDiagnostic,
  createRustDiagnostic,
} from '../src/diagnostics/rust.js';
import type { RunCommand } from '../src/diagnostics/process.js';

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

describe('Rust diagnostic', () => {
  it('passes Rust 1.84.0 and newer', () => {
    const execute: RunCommand = () =>
      result(0, 'rustc 1.84.0 (9fc6b4312 2025-01-07)\n');

    const diagnostic = createRustDiagnostic(execute).run();

    expect(diagnostic.status).toBe('pass');
    expect(diagnostic.message).toContain('1.84.0');
  });

  it('fails Rust below the Stellar smart-contract minimum', () => {
    const execute: RunCommand = () =>
      result(0, 'rustc 1.83.0 (90b35a623 2024-11-26)\n');

    const diagnostic = createRustDiagnostic(execute).run();

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.remediation).toContain('>=1.84.0');
  });

  it('fails when rustc is unavailable without leaking process details', () => {
    const execute: RunCommand = () =>
      result(
        null,
        '',
        'SECRET_TOKEN=do-not-render',
        new Error('spawn rustc ENOENT SECRET_TOKEN=do-not-render'),
      );

    const diagnostic = createRustDiagnostic(execute).run();

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe(
      'Rust is unavailable or could not be executed.',
    );
    expect(JSON.stringify(diagnostic)).not.toContain('SECRET_TOKEN');
  });

  it('fails malformed rustc output', () => {
    const execute: RunCommand = () => result(0, 'rustc unknown\n');

    const diagnostic = createRustDiagnostic(execute).run();

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe('Rust returned an unrecognized version.');
  });
});

describe('Cargo diagnostic', () => {
  it('checks Cargo independently and parses its version', () => {
    const calls: Array<{ executable: string; args: readonly string[] }> = [];
    const execute: RunCommand = (executable, args) => {
      calls.push({ executable, args });
      return result(0, 'cargo 1.89.0 (c24e10642 2025-06-23)\n');
    };

    const diagnostic = createCargoDiagnostic(execute).run();

    expect(calls).toEqual([{ executable: 'cargo', args: ['--version'] }]);
    expect(diagnostic.status).toBe('pass');
    expect(diagnostic.message).toContain('1.89.0');
  });

  it('fails when Cargo is unavailable without affecting Rust checks', () => {
    const execute: RunCommand = () =>
      result(null, '', '', new Error('spawn cargo ENOENT'));

    const diagnostic = createCargoDiagnostic(execute).run();

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.remediation).toContain('cargo');
  });

  it('fails malformed Cargo output', () => {
    const execute: RunCommand = () => result(0, 'cargo unknown\n');

    const diagnostic = createCargoDiagnostic(execute).run();

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe('Cargo returned an unrecognized version.');
  });
});
