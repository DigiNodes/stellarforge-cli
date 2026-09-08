import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createTestCommand } from '../src/commands/test.js';
import type { ManagedChildProcess } from '../src/dev/orchestrator.js';
import { SubprocessCliError } from '../src/errors/errors.js';
import { createCapturedTerminalOutput } from './helpers/index.js';

class TestChild implements ManagedChildProcess {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  #exitListener:
    ((code: number | null, signal: NodeJS.Signals | null) => void) | undefined;

  once(event: 'error', listener: (error: Error) => void): this;
  once(
    event: 'exit',
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): this;
  once(
    event: 'error' | 'exit',
    listener:
      | ((error: Error) => void)
      | ((code: number | null, signal: NodeJS.Signals | null) => void),
  ): this {
    if (event === 'exit') {
      this.#exitListener = listener as (
        code: number | null,
        signal: NodeJS.Signals | null,
      ) => void;
    }
    return this;
  }

  kill(): boolean {
    return true;
  }

  exit(code: number): void {
    this.#exitListener?.(code, null);
  }
}

describe('test command', () => {
  it('streams project test output and completes on a successful child result', async () => {
    const child = new TestChild();
    const captured = createCapturedTerminalOutput();
    const command = createTestCommand({
      cwd: () => '/workspace',
      output: captured.output,
      resolvePlan: () => [
        {
          label: 'demo:test',
          command: 'npm',
          args: ['run', 'test'],
          cwd: '/workspace',
        },
      ],
      spawnProcess: () => child,
    });

    const running = command.parseAsync(['node', 'test']);
    child.stdout.write('all tests passed\n');
    child.exit(0);
    await running;

    expect(captured.stdoutText()).toContain('Running 1 project test workflow.');
    expect(captured.stdoutText()).toContain('[demo:test] all tests passed');
  });

  it('preserves failing project tests as a non-zero subprocess failure', async () => {
    const child = new TestChild();
    const command = createTestCommand({
      cwd: () => '/workspace',
      resolvePlan: () => [
        {
          label: 'demo:test',
          command: 'npm',
          args: ['run', 'test'],
          cwd: '/workspace',
        },
      ],
      spawnProcess: () => child,
    });

    const running = command.parseAsync(['node', 'test']);
    child.exit(9);

    await expect(running).rejects.toBeInstanceOf(SubprocessCliError);
  });
});
