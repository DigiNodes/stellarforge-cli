import { describe, expect, it } from 'vitest';
import type { RunCommand } from '../src/diagnostics/process.js';
import { createStellarDiagnostic } from '../src/diagnostics/stellar.js';

interface CommandResultFixture {
  readonly status: number | null;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly error?: Error;
}

function runDiagnostic(fixture: CommandResultFixture) {
  const execute: RunCommand = () => ({
    status: fixture.status,
    stdout: fixture.stdout ?? '',
    stderr: fixture.stderr ?? '',
    ...(fixture.error === undefined ? {} : { error: fixture.error }),
  });

  return createStellarDiagnostic(execute).run();
}

describe('Stellar CLI diagnostic failure matrix', () => {
  it.each([
    ['27.0.9', '27.0.9'],
    ['26.0.0', '26.0.0'],
    ['20.0.0', '20.0.0'],
    ['0.1.0', '0.1.0'],
    ['v27.0.1', '27.0.1'],
    ['27.0.0-rc.1', '27.0.0'],
  ])('rejects supported-floor predecessor %s', (output, extractedVersion) => {
    const diagnostic = runDiagnostic({ status: 0, stdout: output });

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe(
      `Unsupported Stellar CLI version ${extractedVersion}.`,
    );
    expect(diagnostic.remediation).toContain('>=27.1.0');
  });

  it.each([
    '{"version":"27.1.0"}',
    'version: 27.1.0',
    '<html><body>502 Bad Gateway</body></html>',
  ])('rejects structured or proxy-error output %s', (output) => {
    const diagnostic = runDiagnostic({ status: 0, stdout: output });

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe(
      'Stellar CLI returned an unrecognized version.',
    );
  });

  it.each([
    { status: 2, stderr: 'unrecognized option' },
    { status: 126, stderr: 'permission denied' },
    { status: 137, stderr: 'process killed' },
    {
      status: 1,
      stdout: '27.1.0',
      stderr: 'panic: internal failure',
    },
  ])('fails closed for non-zero execution result $status', (fixture) => {
    const diagnostic = runDiagnostic(fixture);

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe(
      'Stellar CLI is unavailable or could not be executed.',
    );
    expect(diagnostic.remediation).toContain(
      'https://developers.stellar.org/docs/tools/cli/install-cli',
    );
  });

  it.each([
    new Error('spawn stellar ENOENT SECRET_PASSPHRASE=do-not-leak'),
    new Error('spawn stellar EACCES SENSITIVE_KEY=do-not-leak'),
  ])('does not expose executable errors or stderr details', (error) => {
    const diagnostic = runDiagnostic({
      status: null,
      stderr: 'SENSITIVE_KEY=do-not-leak',
      error,
    });
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe(
      'Stellar CLI is unavailable or could not be executed.',
    );
    expect(serialized).not.toContain('SECRET_PASSPHRASE');
    expect(serialized).not.toContain('SENSITIVE_KEY');
    expect(serialized).not.toContain('do-not-leak');
  });
});
