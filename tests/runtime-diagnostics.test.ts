import { describe, expect, it } from 'vitest';
import {
  createNodeDiagnostic,
  createNpmDiagnostic,
} from '../src/diagnostics/runtime.js';
import type { RunCommand } from '../src/diagnostics/process.js';
import { createNpmInvocation } from '../src/process/npm.js';

function commandResult(
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

describe('Node.js diagnostic', () => {
  it('passes a supported Node.js version', () => {
    const result = createNodeDiagnostic('22.13.0').run();

    expect(result.status).toBe('pass');
    expect(result.message).toContain('22.13.0');
  });

  it('fails versions below the supported minimum', () => {
    const result = createNodeDiagnostic('22.12.9').run();

    expect(result.status).toBe('fail');
    expect(result.remediation).toContain('>=22.13.0');
  });

  it('fails Node.js 25 and newer', () => {
    const result = createNodeDiagnostic('25.0.0').run();

    expect(result.status).toBe('fail');
    expect(result.remediation).toContain('<25');
  });

  it('fails malformed versions without throwing', () => {
    const result = createNodeDiagnostic('unknown').run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('valid Node.js version');
  });
});

describe('npm diagnostic', () => {
  it('executes npm with an argument array and passes a supported version', () => {
    const calls: Array<{ executable: string; args: readonly string[] }> = [];
    const execute: RunCommand = (executable, args) => {
      calls.push({ executable, args });
      return commandResult(0, '10.9.2\n');
    };

    const result = createNpmDiagnostic(execute).run();

    const npm = createNpmInvocation(['--version']);
    expect(calls).toEqual([{ executable: npm.command, args: npm.args }]);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('10.9.2');
  });

  it('fails when npm is unavailable without exposing subprocess details', () => {
    const execute: RunCommand = () =>
      commandResult(
        null,
        '',
        'SECRET_TOKEN=do-not-render',
        new Error('spawn npm ENOENT SECRET_TOKEN=do-not-render'),
      );

    const result = createNpmDiagnostic(execute).run();

    expect(result.status).toBe('fail');
    expect(result.message).toBe('npm is unavailable or could not be executed.');
    expect(JSON.stringify(result)).not.toContain('SECRET_TOKEN');
  });

  it('fails npm versions below the supported minimum', () => {
    const execute: RunCommand = () => commandResult(0, '10.8.9\n');

    const result = createNpmDiagnostic(execute).run();

    expect(result.status).toBe('fail');
    expect(result.remediation).toContain('>=10.9.0');
  });

  it('fails unrecognized npm version output', () => {
    const execute: RunCommand = () => commandResult(0, 'npm unknown\n');

    const result = createNpmDiagnostic(execute).run();

    expect(result.status).toBe('fail');
    expect(result.message).toBe('npm returned an unrecognized version.');
  });
});
