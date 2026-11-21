import { CommanderError } from 'commander';
import { TerminalOutput } from '../output/index.js';
import { redactSecretLikeText } from '../output/redaction.js';
import { CliError, EXIT_CODES, type CliExitCode } from './errors.js';

const UNEXPECTED_ERROR_MESSAGE =
  'StellarForge encountered an unexpected error.';

// Standardised user-interrupt (SIGINT/Ctrl-C) cancellation message.
// This is the documented user-facing text for a clean cancellation.
export const CANCELLATION_MESSAGE = 'Cancelled.';

// Documented message for the forced-exit path taken when a second
// interrupt signal arrives while cleanup is still in progress.
export const FORCED_EXIT_MESSAGE =
  'Received a second interrupt signal; forcing exit.';

// Documented non-zero exit code reported for a clean user-interrupt
// cancellation. 130 is the conventional 128+SIGINT shell code.
export const CANCELLATION_EXIT_CODE: CliExitCode = EXIT_CODES.cancelled;

/** Error raised when a command is interrupted by the user. */
export class CancellationCliError extends CliError {
  readonly command: string;
  readonly code = 'CANCELLED';

  constructor(command = 'cli') {
    super('CancellationCliError', CANCELLATION_MESSAGE, CANCELLATION_EXIT_CODE);
    this.command = command;
  }
}

export interface CancellationSignal {
  readonly aborted: boolean;
  readonly reason: unknown;
}

export interface CancellationController {
  begin(): CancellationSignal;
  end(): void;
}

/** Tracks interrupts for a synchronous command that can be cancelled. */
export function createCancellationController(): CancellationController {
  let onSignal: (() => void) | undefined;

  return {
    begin() {
      const controller = new AbortController();
      onSignal = () => {
        controller.abort(new CancellationCliError());
      };
      process.on('SIGINT', onSignal);
      process.on('SIGTERM', onSignal);

      return {
        get aborted() {
          return controller.signal.aborted;
        },
        get reason() {
          return controller.signal.reason as unknown;
        },
      };
    },
    end() {
      if (onSignal !== undefined) {
        process.off('SIGINT', onSignal);
        process.off('SIGTERM', onSignal);
        onSignal = undefined;
      }
    },
  };
}

export interface CancellationHandler {
  isCancelled(): boolean;
  reportCancellation(): void;
  dispose(): void;
}

/** Tracks interrupts for an async command that owns child-process cleanup. */
export function createCancellationHandler(options: {
  readonly command: string;
  readonly output: TerminalOutput;
}): CancellationHandler {
  let cancelled = false;
  const onSignal = () => {
    cancelled = true;
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  return {
    isCancelled: () => cancelled,
    reportCancellation: () => {
      options.output.error(CANCELLATION_MESSAGE);
    },
    dispose: () => {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
    },
  };
}

export interface CliErrorBoundaryOptions {
  // Opt-in diagnostic detail for maintainers: normal user-facing errors stay
  // a clean one-line message, but with this set the underlying stack (or
  // cause) is also reported. Never enabled by default so published builds
  // never surface it unless a developer explicitly asks for it.
  readonly debug?: boolean;
}

// Recognises the `DEBUG` env var convention (`DEBUG=stellarforge`,
// `DEBUG=stellarforge:*`, or `DEBUG=*`) as the opt-in for CLI stack-trace
// diagnostics, without pulling in a logging dependency for it.
export function isDebugEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return value
    .split(',')
    .map((token) => token.trim())
    .some(
      (token) =>
        token === '*' ||
        token === 'stellarforge' ||
        token === 'stellarforge*' ||
        token.startsWith('stellarforge:'),
    );
}

function reportDebugDetail(
  output: TerminalOutput,
  options: CliErrorBoundaryOptions,
  detail: unknown,
): void {
  if (!options.debug || detail === undefined) {
    return;
  }

  const text =
    detail instanceof Error ? (detail.stack ?? detail.message) : String(detail);
  // redactSecretLikeText matches sensitive-assignment patterns up to the end
  // of its input, so a multi-line stack must be redacted line by line.
  const redacted = text
    .split('\n')
    .map((line) => redactSecretLikeText(line))
    .join('\n');
  output.error(`[debug] ${redacted}`);
}

export function handleCliError(
  error: unknown,
  output: TerminalOutput = new TerminalOutput(),
  options: CliErrorBoundaryOptions = {},
): CliExitCode {
  if (error instanceof CommanderError) {
    return error.exitCode === EXIT_CODES.success
      ? EXIT_CODES.success
      : EXIT_CODES.validation;
  }

  if (error instanceof CliError) {
    output.error(error.userMessage);
    reportDebugDetail(output, options, error.cause);
    return error.exitCode;
  }

  output.error(UNEXPECTED_ERROR_MESSAGE);
  reportDebugDetail(output, options, error);
  return EXIT_CODES.unexpected;
}

export async function runWithCliErrorBoundary(
  action: () => void | Promise<void>,
  output: TerminalOutput = new TerminalOutput(),
  options: CliErrorBoundaryOptions = {},
): Promise<CliExitCode> {
  try {
    await action();
    return EXIT_CODES.success;
  } catch (error) {
    return handleCliError(error, output, options);
  }
}
