import { CommanderError } from 'commander';
import { describe, expect, it } from 'vitest';
import {
  EXIT_CODES,
  InternalCliError,
  runWithCliErrorBoundary,
  SubprocessCliError,
  ValidationCliError,
} from '../src/errors/index.js';
import { TerminalOutput, type TextOutputStream } from '../src/output/index.js';

function captureOutput() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const createStream = (target: string[]): TextOutputStream => ({
    write(chunk: string) {
      target.push(chunk);
    },
  });

  return {
    output: new TerminalOutput({
      stdout: createStream(stdout),
      stderr: createStream(stderr),
    }),
    stdout,
    stderr,
  };
}

describe('CLI error boundary', () => {
  it('returns success when the action completes', async () => {
    const { output, stdout, stderr } = captureOutput();

    const exitCode = await runWithCliErrorBoundary(() => undefined, output);

    expect(exitCode).toBe(EXIT_CODES.success);
    expect(stdout).toEqual([]);
    expect(stderr).toEqual([]);
  });

  it('renders validation errors safely and returns the validation code', async () => {
    const { output, stderr } = captureOutput();

    const exitCode = await runWithCliErrorBoundary(() => {
      throw new ValidationCliError('Project name is required.');
    }, output);

    expect(exitCode).toBe(EXIT_CODES.validation);
    expect(stderr).toEqual(['Project name is required.\n']);
  });

  it('renders subprocess errors safely and returns the subprocess code', async () => {
    const { output, stderr } = captureOutput();

    const exitCode = await runWithCliErrorBoundary(() => {
      throw new SubprocessCliError('The requested tool exited unsuccessfully.');
    }, output);

    expect(exitCode).toBe(EXIT_CODES.subprocess);
    expect(stderr).toEqual(['The requested tool exited unsuccessfully.\n']);
  });

  it('preserves an internal cause without exposing it to the user', async () => {
    const { output, stderr } = captureOutput();
    const cause = new Error('private-key=SECRET_INTERNAL_VALUE');
    const error = new InternalCliError({ cause });

    const exitCode = await runWithCliErrorBoundary(() => {
      throw error;
    }, output);

    expect(exitCode).toBe(EXIT_CODES.internal);
    expect(error.cause).toBe(cause);
    expect(stderr).toEqual(['StellarForge encountered an internal error.\n']);
    expect(stderr.join('')).not.toContain('SECRET_INTERNAL_VALUE');
  });

  it('hides unexpected exception details behind a generic message', async () => {
    const { output, stderr } = captureOutput();

    const exitCode = await runWithCliErrorBoundary(() => {
      throw new Error('token=SECRET_UNEXPECTED_VALUE');
    }, output);

    expect(exitCode).toBe(EXIT_CODES.unexpected);
    expect(stderr).toEqual(['StellarForge encountered an unexpected error.\n']);
    expect(stderr.join('')).not.toContain('SECRET_UNEXPECTED_VALUE');
  });

  it('maps Commander usage failures without double-rendering them', async () => {
    const { output, stderr } = captureOutput();

    const exitCode = await runWithCliErrorBoundary(() => {
      throw new CommanderError(1, 'commander.unknownOption', 'unknown option');
    }, output);

    expect(exitCode).toBe(EXIT_CODES.validation);
    expect(stderr).toEqual([]);
  });

  it('preserves successful Commander help/version exits', async () => {
    const { output, stderr } = captureOutput();

    const exitCode = await runWithCliErrorBoundary(() => {
      throw new CommanderError(0, 'commander.helpDisplayed', 'help displayed');
    }, output);

    expect(exitCode).toBe(EXIT_CODES.success);
    expect(stderr).toEqual([]);
  });
});
