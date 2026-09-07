import {
  TerminalOutput,
  type TextOutputStream,
} from '../../src/output/index.js';

export interface CapturedTerminalOutput {
  readonly output: TerminalOutput;
  readonly stdout: string[];
  readonly stderr: string[];
  stdoutText(): string;
  stderrText(): string;
}

function createCaptureStream(target: string[]): TextOutputStream {
  return {
    write(chunk: string) {
      target.push(chunk);
    },
  };
}

export function createCapturedTerminalOutput(): CapturedTerminalOutput {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    output: new TerminalOutput({
      stdout: createCaptureStream(stdout),
      stderr: createCaptureStream(stderr),
    }),
    stdout,
    stderr,
    stdoutText: () => stdout.join(''),
    stderrText: () => stderr.join(''),
  };
}
