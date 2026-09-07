import { describe, expect, it } from 'vitest';
import {
  sanitizeTerminalText,
  TerminalOutput,
  type TextOutputStream,
} from '../src/output/terminal.js';

function createCaptureStream(target: string[]): TextOutputStream {
  return {
    write(chunk: string) {
      target.push(chunk);
    },
  };
}

function createCapturedOutput() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const output = new TerminalOutput({
    stdout: createCaptureStream(stdout),
    stderr: createCaptureStream(stderr),
  });

  return { output, stdout, stderr };
}

describe('TerminalOutput', () => {
  it('routes informational and success messages to stdout', () => {
    const { output, stdout, stderr } = createCapturedOutput();

    output.info('informational');
    output.success('successful');

    expect(stdout).toEqual(['informational\n', 'successful\n']);
    expect(stderr).toEqual([]);
  });

  it('routes warning and error messages to stderr', () => {
    const { output, stdout, stderr } = createCapturedOutput();

    output.warning('warning');
    output.error('failure');

    expect(stdout).toEqual([]);
    expect(stderr).toEqual(['warning\n', 'failure\n']);
  });

  it('does not require TTY-specific stream properties', () => {
    const { output, stdout } = createCapturedOutput();

    output.info('works in CI');

    expect(stdout).toEqual(['works in CI\n']);
  });

  it('neutralizes ANSI CSI and remaining terminal control characters', () => {
    expect(sanitizeTerminalText('safe\u001b[31mred\u001b[0m\u0000text')).toBe(
      'saferedtext',
    );
  });

  it('preserves ordinary tabs and newlines while removing carriage returns', () => {
    expect(sanitizeTerminalText('one\ttwo\nthree\rfour')).toBe(
      'one\ttwo\nthreefour',
    );
  });
});
