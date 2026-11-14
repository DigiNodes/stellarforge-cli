import { describe, expect, it } from 'vitest';
import {
  classifyCommandResult,
  isExecutableNotFound,
  type CommandResult,
} from '../src/diagnostics/process.js';
import {
  createCargoDiagnostic,
  createRustDiagnostic,
} from '../src/diagnostics/rust.js';
import { createGitDiagnostic } from '../src/diagnostics/git.js';
import { createStellarDiagnostic } from '../src/diagnostics/stellar.js';
import { createNpmDiagnostic } from '../src/diagnostics/runtime.js';
import { createDockerDiagnostic } from '../src/diagnostics/docker.js';
import type { RunCommand } from '../src/diagnostics/process.js';

function result(
  status: number | null,
  stdout = '',
  stderr = '',
  error?: Error,
): CommandResult {
  return {
    status,
    stdout,
    stderr,
    ...(error === undefined ? {} : { error }),
  };
}

function enoent(message = 'spawn tool ENOENT'): Error {
  const error = new Error(message) as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  return error;
}

describe('executable-not-found classification', () => {
  it('recognizes an ENOENT error code', () => {
    expect(isExecutableNotFound(enoent())).toBe(true);
  });

  it('recognizes only an ENOENT substring in the error message', () => {
    expect(isExecutableNotFound(new Error('spawn git ENOENT'))).toBe(true);
    expect(isExecutableNotFound(new Error('spawn git EACCES'))).toBe(false);
    expect(isExecutableNotFound(new Error('enoent-looking lowercase'))).toBe(
      false,
    );
  });

  it('does not classify non-error or nullish values', () => {
    expect(isExecutableNotFound(undefined)).toBe(false);
    expect(isExecutableNotFound(null)).toBe(false);
    expect(isExecutableNotFound('ENOENT')).toBe(false);
  });
});

describe('command outcome classification', () => {
  it('returns ok for a successful command', () => {
    expect(classifyCommandResult(result(0, 'ok'))).toBe('ok');
  });

  it('distinguishes a missing executable from a generic failure', () => {
    expect(classifyCommandResult(result(null, '', '', enoent()))).toBe(
      'missing-executable',
    );
    expect(
      classifyCommandResult(result(null, '', '', new Error('timed out'))),
    ).toBe('failed');
  });

  it('treats a non-zero exit as failed', () => {
    expect(classifyCommandResult(result(1, '', 'boom'))).toBe('failed');
  });
});

describe('diagnostics classify missing executables consistently', () => {
  const missing: RunCommand = () => result(null, '', '', enoent());

  it('fails Git, Rust, Cargo, Stellar CLI, and npm uniformly', () => {
    const checks = [
      createGitDiagnostic(missing).run(),
      createRustDiagnostic(missing).run(),
      createCargoDiagnostic(missing).run(),
      createStellarDiagnostic(missing).run(),
      createNpmDiagnostic(missing).run(),
    ];

    for (const check of checks) {
      expect(check.status).toBe('fail');
      expect(JSON.stringify(check)).not.toContain('ENOENT');
    }
  });

  it('warns for an optional missing Docker CLI without leaking output', () => {
    const check = createDockerDiagnostic({ execute: missing }).run();

    expect(check.status).toBe('warn');
    expect(JSON.stringify(check)).not.toContain('ENOENT');
  });

  it('never invokes a shell fallback for missing executables', () => {
    const calls: Array<{ executable: string; args: readonly string[] }> = [];
    const execute: RunCommand = (executable, args) => {
      calls.push({ executable, args });
      return result(null, '', '', enoent());
    };

    createGitDiagnostic(execute).run();

    expect(calls).toEqual([{ executable: 'git', args: ['--version'] }]);
  });
});

describe('diagnostic timeouts', () => {
  const timeout = Object.assign(new Error('private process details'), {
    code: 'ETIMEDOUT',
  });
  const execute: RunCommand = () => result(null, '', 'private stderr', timeout);

  it('classifies the structured timeout code without relying on message text', () => {
    expect(classifyCommandResult(execute('tool', []))).toBe('timed-out');
    expect(
      classifyCommandResult(result(null, '', '', new Error('ETIMEDOUT'))),
    ).toBe('failed');
  });

  it('returns safe timeout guidance for Git, Rust and Cargo', () => {
    for (const check of [
      createGitDiagnostic(execute),
      createRustDiagnostic(execute),
      createCargoDiagnostic(execute),
    ]) {
      const diagnostic = check.run();
      expect(diagnostic.status).toBe('fail');
      expect(diagnostic.message).toContain('timed out');
      expect(diagnostic.remediation).toContain('responds promptly');
      expect(JSON.stringify(diagnostic)).not.toContain('private');
    }
  });

  it.each([false, true])(
    'preserves Docker required=%s for client and daemon timeouts',
    (required) => {
      for (const daemonTimeout of [false, true]) {
        const diagnostic = createDockerDiagnostic({
          required,
          execute: (executable, args) =>
            daemonTimeout && args[0] === '--version'
              ? result(0, 'Docker version 27.0.0')
              : execute(executable, args),
        }).run();
        expect(diagnostic.status).toBe(required ? 'fail' : 'warn');
        expect(diagnostic.message).toContain('timed out');
        expect(JSON.stringify(diagnostic)).not.toContain('private');
      }
    },
  );
});
