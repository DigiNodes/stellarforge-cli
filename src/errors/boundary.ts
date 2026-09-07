import { CommanderError } from 'commander';
import { TerminalOutput } from '../output/index.js';
import { CliError, EXIT_CODES, type CliExitCode } from './errors.js';

const UNEXPECTED_ERROR_MESSAGE = 'StellarForge encountered an unexpected error.';

export function handleCliError(
  error: unknown,
  output: TerminalOutput = new TerminalOutput(),
): CliExitCode {
  if (error instanceof CommanderError) {
    return error.exitCode === EXIT_CODES.success
      ? EXIT_CODES.success
      : EXIT_CODES.validation;
  }

  if (error instanceof CliError) {
    output.error(error.userMessage);
    return error.exitCode;
  }

  output.error(UNEXPECTED_ERROR_MESSAGE);
  return EXIT_CODES.unexpected;
}

export async function runWithCliErrorBoundary(
  action: () => void | Promise<void>,
  output: TerminalOutput = new TerminalOutput(),
): Promise<CliExitCode> {
  try {
    await action();
    return EXIT_CODES.success;
  } catch (error) {
    return handleCliError(error, output);
  }
}
