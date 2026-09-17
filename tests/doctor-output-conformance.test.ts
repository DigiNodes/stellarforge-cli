import { describe, expect, it } from 'vitest';
import { createDoctorCommand } from '../src/commands/doctor.js';
import type { DiagnosticCheck } from '../src/diagnostics/types.js';
import { EXIT_CODES } from '../src/errors/errors.js';
import { createCapturedTerminalOutput } from './helpers/index.js';

function check(
  id: string,
  label: string,
  status: 'pass' | 'warn' | 'fail',
  message: string,
  remediation?: string,
): DiagnosticCheck {
  return {
    id,
    label,
    run: () => ({
      id,
      label,
      status,
      message,
      ...(remediation === undefined ? {} : { remediation }),
    }),
  };
}

function renderDoctorOutput(checks: readonly DiagnosticCheck[]): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  const captured = createCapturedTerminalOutput();
  let exitCode = -1;

  const command = createDoctorCommand({
    checks,
    output: captured.output,
    setExitCode: (code) => {
      exitCode = code;
    },
  });

  command.parse(['node', 'doctor']);

  return {
    stdout: captured.stdoutText(),
    stderr: captured.stderrText(),
    exitCode,
  };
}

describe('doctor output conformance', () => {
  it('keeps an all-pass rendering stable', () => {
    const result = renderDoctorOutput([
      check('node', 'Node.js', 'pass', 'Supported version detected.'),
      check('git', 'Git', 'pass', 'Git is available.'),
    ]);

    expect(result.exitCode).toBe(EXIT_CODES.success);
    expect(result.stderr).toBe('');

    expect(result.stdout).toMatchSnapshot();
  });

  it('keeps a warning rendering stable', () => {
    const result = renderDoctorOutput([
      check('node', 'Node.js', 'pass', 'Supported version detected.'),
      check(
        'docker',
        'Docker',
        'warn',
        'Docker is not available.',
        'Install Docker only if the selected workflow requires it.',
      ),
    ]);

    expect(result.exitCode).toBe(EXIT_CODES.success);
    expect(result.stderr).toBe('');

    expect(result.stdout).toMatchSnapshot();
  });

  it('keeps a failure rendering stable', () => {
    const result = renderDoctorOutput([
      check('node', 'Node.js', 'pass', 'Supported version detected.'),
      check(
        'stellar',
        'Stellar CLI',
        'fail',
        'Required CLI is missing.',
        'Install the official Stellar CLI.',
      ),
    ]);

    expect(result.exitCode).toBe(EXIT_CODES.diagnostic);
    expect(result.stderr).toBe('');

    expect(result.stdout).toMatchSnapshot();
  });

  it('preserves status ordering and summary markers', () => {
    const result = renderDoctorOutput([
      check('node', 'Node.js', 'pass', 'Supported version detected.'),
      check('docker', 'Docker', 'warn', 'Docker is not available.'),
      check('stellar', 'Stellar CLI', 'fail', 'Required CLI is missing.'),
    ]);

    expect(result.stdout).toContain(
      '[PASS] Node.js: Supported version detected.',
    );
    expect(result.stdout).toContain('[WARN] Docker: Docker is not available.');
    expect(result.stdout).toContain(
      '[FAIL] Stellar CLI: Required CLI is missing.',
    );

    expect(result.stdout).toContain('Summary: 1 passed, 1 warnings, 1 failed.');

    expect(result.stdout).toContain('Overall health: action required.');

    expect(result.stdout.indexOf('[PASS]')).toBeLessThan(
      result.stdout.indexOf('[WARN]'),
    );

    expect(result.stdout.indexOf('[WARN]')).toBeLessThan(
      result.stdout.indexOf('[FAIL]'),
    );
  });
});
