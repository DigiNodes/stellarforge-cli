export interface TextOutputStream {
  write(chunk: string): unknown;
}

export interface TerminalOutputStreams {
  stdout: TextOutputStream;
  stderr: TextOutputStream;
}

const TERMINAL_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

export function sanitizeTerminalText(message: string): string {
  return message.replace(TERMINAL_CONTROL_CHARACTERS, '');
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
