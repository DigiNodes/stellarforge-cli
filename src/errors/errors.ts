export const EXIT_CODES = {
  success: 0,
  unexpected: 1,
  validation: 2,
  subprocess: 3,
  internal: 4,
} as const;

export type CliExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

export abstract class CliError extends Error {
  readonly exitCode: CliExitCode;
  readonly userMessage: string;

  protected constructor(
    name: string,
    userMessage: string,
    exitCode: CliExitCode,
    options?: ErrorOptions,
  ) {
    super(userMessage, options);
    this.name = name;
    this.userMessage = userMessage;
    this.exitCode = exitCode;
  }
}

export class ValidationCliError extends CliError {
  constructor(userMessage: string, options?: ErrorOptions) {
    super('ValidationCliError', userMessage, EXIT_CODES.validation, options);
  }
}

export class SubprocessCliError extends CliError {
  constructor(userMessage: string, options?: ErrorOptions) {
    super('SubprocessCliError', userMessage, EXIT_CODES.subprocess, options);
  }
}

export class InternalCliError extends CliError {
  constructor(options?: ErrorOptions) {
    super(
      'InternalCliError',
      'StellarForge encountered an internal error.',
      EXIT_CODES.internal,
      options,
    );
  }
}
