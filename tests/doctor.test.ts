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

describe('doctor command', () => {
  it('renders an empty scaffold without failing when checks are explicitly empty', () => {
    const captured = createCapturedTerminalOutput();
    let exitCode = -1;
    const command = createDoctorCommand({
      checks: [],
      output: captured.output,
      setExitCode: (code) => {
        exitCode = code;
      },
    });

    command.parse(['node', 'doctor']);

    expect(exitCode).toBe(EXIT_CODES.success);
    expect(captured.stdoutText()).toContain(
      'No diagnostics are registered yet.',
    );
    expect(captured.stdoutText()).toContain(
      'Summary: 0 passed, 0 warnings, 0 failed.',
    );
    expect(captured.stdoutText()).toContain(
      'Overall health: no diagnostics registered.',
    );
    expect(captured.stderrText()).toBe('');
  });

  it('aggregates pass, warning, and failure results with actionable health output', () => {
    const captured = createCapturedTerminalOutput();
    let exitCode = -1;
    const command = createDoctorCommand({
      checks: [
        check('node', 'Node.js', 'pass', 'Supported version detected.'),
        check(
          'docker',
          'Docker',
          'warn',
          'Docker is not available.',
          'Install Docker only if the selected workflow requires it.',
        ),
        check(
          'stellar',
          'Stellar CLI',
          'fail',
          'Required CLI is missing.',
          'Install the official Stellar CLI.',
        ),
      ],
      output: captured.output,
      setExitCode: (code) => {
        exitCode = code;
      },
    });

    command.parse(['node', 'doctor']);

    expect(exitCode).toBe(EXIT_CODES.diagnostic);
    expect(captured.stdoutText()).toContain(
      '[PASS] Node.js: Supported version detected.',
    );
    expect(captured.stdoutText()).toContain(
      '[WARN] Docker: Docker is not available.',
    );
    expect(captured.stdoutText()).toContain(
      'Remediation: Install Docker only if the selected workflow requires it.',
    );
    expect(captured.stdoutText()).toContain(
      '[FAIL] Stellar CLI: Required CLI is missing.',
    );
    expect(captured.stdoutText()).toContain(
      'Remediation: Install the official Stellar CLI.',
    );
    expect(captured.stdoutText()).toContain(
      'Summary: 1 passed, 1 warnings, 1 failed.',
    );
    expect(captured.stdoutText()).toContain('Overall health: action required.');
  });

  it('keeps warning-only diagnostics non-fatal', () => {
    const captured = createCapturedTerminalOutput();
    let exitCode = -1;
    const command = createDoctorCommand({
      checks: [
        check('node', 'Node.js', 'pass', 'Supported version detected.'),
        check(
          'docker',
          'Docker',
          'warn',
          'Docker daemon is unavailable.',
          'Start Docker only when a container-based workflow needs it.',
        ),
      ],
      output: captured.output,
      setExitCode: (code) => {
        exitCode = code;
      },
    });

    command.parse(['node', 'doctor']);

    expect(exitCode).toBe(EXIT_CODES.success);
    expect(captured.stdoutText()).toContain(
      'Summary: 1 passed, 1 warnings, 0 failed.',
    );
    expect(captured.stdoutText()).toContain(
      'Overall health: usable with warnings.',
    );
  });

  it('reports a fully healthy diagnostic run clearly', () => {
    const captured = createCapturedTerminalOutput();
    let exitCode = -1;
    const command = createDoctorCommand({
      checks: [check('node', 'Node.js', 'pass', 'Supported version detected.')],
      output: captured.output,
      setExitCode: (code) => {
        exitCode = code;
      },
    });

    command.parse(['node', 'doctor']);

    expect(exitCode).toBe(EXIT_CODES.success);
    expect(captured.stdoutText()).toContain('Overall health: ready.');
  });

  it('converts an unexpected check exception into a safe failed diagnostic', () => {
    const captured = createCapturedTerminalOutput();
    let exitCode = -1;
    const command = createDoctorCommand({
      checks: [
        {
          id: 'unsafe',
          label: 'Unsafe check',
          run() {
            throw new Error('SECRET_TOKEN=do-not-render');
          },
        },
      ],
      output: captured.output,
      setExitCode: (code) => {
        exitCode = code;
      },
    });

    command.parse(['node', 'doctor']);

    expect(exitCode).toBe(EXIT_CODES.diagnostic);
    expect(captured.stdoutText()).toContain(
      '[FAIL] Unsafe check: Diagnostic check could not complete.',
    );
    expect(captured.stdoutText()).toContain(
      'Remediation: Retry the command or inspect the relevant tool configuration.',
    );
    expect(captured.stdoutText()).not.toContain('SECRET_TOKEN');
  });
});
