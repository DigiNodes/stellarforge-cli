import { describe, expect, it } from 'vitest';
import type { RunCommand } from '../src/diagnostics/process.js';
import { createStellarDiagnostic } from '../src/diagnostics/stellar.js';
import {
  MALFORMED_STELLAR_OUTPUT_FIXTURES,
  MISSING_EXECUTABLE_FIXTURES,
  NON_ZERO_EXECUTION_FIXTURES,
  SUPPORTED_STELLAR_VERSION_FIXTURES,
  UNSUPPORTED_STELLAR_VERSION_FIXTURES,
} from './helpers/stellar-diagnostic-fixtures.js';

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
  describe('supported version output fixtures', () => {
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

    it.each(SUPPORTED_STELLAR_VERSION_FIXTURES)(
      'accepts $description: "$rawOutput"',
      ({ rawOutput, expectedVersion }) => {
        const execute: RunCommand = () => result(0, rawOutput);
        const diagnostic = createStellarDiagnostic(execute).run();

        expect(diagnostic.status).toBe('pass');
        expect(diagnostic.id).toBe('stellar');
        expect(diagnostic.label).toBe('Stellar CLI');
        expect(diagnostic.message).toBe(
          `Supported version ${expectedVersion} detected.`,
        );
      },
    );
  });

  describe('unsupported baseline version fixtures', () => {
    it.each(UNSUPPORTED_STELLAR_VERSION_FIXTURES)(
      'fails $description: "$rawOutput"',
      ({ rawOutput, extractedVersion }) => {
        const execute: RunCommand = () => result(0, rawOutput);
        const diagnostic = createStellarDiagnostic(execute).run();

        expect(diagnostic.status).toBe('fail');
        expect(diagnostic.id).toBe('stellar');
        expect(diagnostic.label).toBe('Stellar CLI');
        expect(diagnostic.message).toBe(
          `Unsupported Stellar CLI version ${extractedVersion}.`,
        );
        expect(diagnostic.remediation).toBe(
          'Upgrade to Stellar CLI >=27.1.0 before using StellarForge Stellar workflows.',
        );
      },
    );
  });

  describe('malformed version output fixtures', () => {
    it.each(MALFORMED_STELLAR_OUTPUT_FIXTURES)(
      'safely classifies $description: "$rawOutput"',
      ({ rawOutput }) => {
        const execute: RunCommand = () => result(0, rawOutput);
        const diagnostic = createStellarDiagnostic(execute).run();

        expect(diagnostic.status).toBe('fail');
        expect(diagnostic.id).toBe('stellar');
        expect(diagnostic.label).toBe('Stellar CLI');
        expect(diagnostic.message).toBe(
          'Stellar CLI returned an unrecognized version.',
        );
        expect(diagnostic.remediation).toContain(
          'Verify `stellar version --only-version` works',
        );
      },
    );
  });

  describe('non-zero execution exit codes', () => {
    it.each(NON_ZERO_EXECUTION_FIXTURES)(
      'fails on $description',
      ({ status, stdout, stderr }) => {
        const execute: RunCommand = () => result(status, stdout, stderr);
        const diagnostic = createStellarDiagnostic(execute).run();

        expect(diagnostic.status).toBe('fail');
        expect(diagnostic.id).toBe('stellar');
        expect(diagnostic.message).toBe(
          'Stellar CLI is unavailable or could not be executed.',
        );
        expect(diagnostic.remediation).toContain(
          'https://developers.stellar.org/docs/tools/cli/install-cli',
        );
      },
    );
  });

  describe('missing executable and execution error fixtures', () => {
    it.each(MISSING_EXECUTABLE_FIXTURES)(
      'remains actionable for $description',
      ({ error, stderr }) => {
        const execute: RunCommand = () => result(null, '', stderr, error);
        const diagnostic = createStellarDiagnostic(execute).run();

        expect(diagnostic.status).toBe('fail');
        expect(diagnostic.id).toBe('stellar');
        expect(diagnostic.message).toBe(
          'Stellar CLI is unavailable or could not be executed.',
        );
        expect(diagnostic.remediation).toContain(
          'Install the current Stellar CLI and ensure `stellar` is available on PATH.',
        );
        expect(diagnostic.remediation).toContain(
          'https://developers.stellar.org/docs/tools/cli/install-cli',
        );

        // Verify process error and stderr details are not leaked into user-facing output
        const serialized = JSON.stringify(diagnostic);
        expect(serialized).not.toContain('SECRET_PASSPHRASE');
        expect(serialized).not.toContain('SENSITIVE_KEY');
      },
    );
  });

  describe('protected surface and contract integrity', () => {
    it('strictly preserves the official stellar executable contract without legacy soroban fallback', () => {
      const executedCommands: string[] = [];
      const execute: RunCommand = (executable) => {
        executedCommands.push(executable);
        return result(null, '', '', new Error(`spawn ${executable} ENOENT`));
      };

      const diagnostic = createStellarDiagnostic(execute).run();

      expect(executedCommands).toEqual(['stellar']);
      expect(executedCommands).not.toContain('soroban');
      expect(diagnostic.status).toBe('fail');
    });

    it('does not inspect wallet, identities, networks, or configuration keys', () => {
      const recordedArguments: Array<{
        executable: string;
        args: readonly string[];
      }> = [];
      const execute: RunCommand = (executable, args) => {
        recordedArguments.push({ executable, args });
        return result(0, '27.1.0\n');
      };

      createStellarDiagnostic(execute).run();

      expect(recordedArguments).toHaveLength(1);
      const invocation = recordedArguments[0];
      expect(invocation).toBeDefined();
      if (!invocation) throw new Error('Expected invocation');
      expect(invocation.executable).toBe('stellar');
      expect(invocation.args).toEqual(['version', '--only-version']);

      // Ensure no inspection flags or subcommands were passed
      const forbiddenInspectionTokens = [
        'identity',
        'keys',
        'network',
        'config',
        'contract',
        'secret',
        'account',
      ];
      for (const arg of invocation.args) {
        for (const token of forbiddenInspectionTokens) {
          expect(arg.toLowerCase()).not.toContain(token);
        }
      }
    });
  });
});
