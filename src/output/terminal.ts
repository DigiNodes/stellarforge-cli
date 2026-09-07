export interface TextOutputStream {
  write(chunk: string): unknown;
}

export interface TerminalOutputStreams {
  stdout: TextOutputStream;
  stderr: TextOutputStream;
}

const ANSI_CSI_SEQUENCE = /(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]/g;
const TERMINAL_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

export function sanitizeTerminalText(message: string): string {
  return message
    .replace(ANSI_CSI_SEQUENCE, '')
    .replace(TERMINAL_CONTROL_CHARACTERS, '');
}

export class TerminalOutput {
  readonly #streams: TerminalOutputStreams;

  constructor(
    streams: TerminalOutputStreams = {
      stdout: process.stdout,
      stderr: process.stderr,
    },
  ) {
    this.#streams = streams;
  }

  info(message: string): void {
    this.#write(this.#streams.stdout, message);
  }

  success(message: string): void {
    this.#write(this.#streams.stdout, message);
  }

  warning(message: string): void {
    this.#write(this.#streams.stderr, message);
  }

  error(message: string): void {
    this.#write(this.#streams.stderr, message);
  }

  #write(stream: TextOutputStream, message: string): void {
    stream.write(`${sanitizeTerminalText(message)}\n`);
  }
}
