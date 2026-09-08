import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  superviseDevProcesses,
  type DevSignalSource,
  type ManagedChildProcess,
} from '../src/dev/orchestrator.js';
import type { DevProcessSpec } from '../src/dev/project.js';
import { SubprocessCliError } from '../src/errors/errors.js';
import { createCapturedTerminalOutput } from './helpers/index.js';

class FakeChild implements ManagedChildProcess {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly killedSignals: NodeJS.Signals[] = [];
  #errorListener: ((error: Error) => void) | undefined;
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
    if (event === 'error') {
      this.#errorListener = listener as (error: Error) => void;
    } else {
      this.#exitListener = listener as (
        code: number | null,
        signal: NodeJS.Signals | null,
      ) => void;
    }

    return this;
  }

  kill(signal: NodeJS.Signals = 'SIGTERM'): boolean {
    this.killedSignals.push(signal);
    queueMicrotask(() => this.emitExit(null, signal));
    return true;
  }

  emitError(error: Error): void {
    this.#errorListener?.(error);
  }

  emitExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.#exitListener?.(code, signal);
  }
}

class FakeSignalSource implements DevSignalSource {
  readonly #listeners = new Map<NodeJS.Signals, () => void>();

  once(signal: NodeJS.Signals, listener: () => void): void {
    this.#listeners.set(signal, listener);
  }

  removeListener(signal: NodeJS.Signals, listener: () => void): void {
    if (this.#listeners.get(signal) === listener) {
      this.#listeners.delete(signal);
    }
  }

  emit(signal: NodeJS.Signals): void {
    const listener = this.#listeners.get(signal);
    this.#listeners.delete(signal);
    listener?.();
  }

  has(signal: NodeJS.Signals): boolean {
    return this.#listeners.has(signal);
  }
}

const SPEC: DevProcessSpec = {
  label: 'api',
  command: 'npm',
  args: ['run', 'start'],
  cwd: '/workspace',
};

describe('development process supervisor', () => {
  it('uses filtered environment values, prefixes output, and resolves on clean exit', async () => {
    const child = new FakeChild();
    const captured = createCapturedTerminalOutput();
    let childEnvironment: NodeJS.ProcessEnv | undefined;

    const running = superviseDevProcesses([SPEC], {
      output: captured.output,
      environment: {
        PATH: '/usr/bin',
        STELLAR_NETWORK: 'TESTNET',
        SECRET_TOKEN: 'must-not-propagate',
        NODE_OPTIONS: '--require malicious.js',
      },
      spawnProcess(_spec, environment) {
        childEnvironment = environment;
        return child;
      },
      signalSource: new FakeSignalSource(),
    });

    child.stdout.write('ready\n');
    child.stderr.write('warning\n');
    child.emitExit(0, null);
    await running;

    expect(childEnvironment?.PATH).toBe('/usr/bin');
    expect(childEnvironment?.STELLAR_NETWORK).toBe('TESTNET');
    expect(childEnvironment?.SECRET_TOKEN).toBeUndefined();
    expect(childEnvironment?.NODE_OPTIONS).toBeUndefined();
    expect(captured.stdoutText()).toContain('[api] ready');
    expect(captured.stderrText()).toContain('[api] warning');
  });

  it.each(['SIGINT', 'SIGTERM'] as const)(
    'terminates children and removes signal handlers after %s',
    async (signal) => {
      const child = new FakeChild();
      const signals = new FakeSignalSource();
      const running = superviseDevProcesses([SPEC], {
        spawnProcess: () => child,
        signalSource: signals,
      });

      signals.emit(signal);
      await running;

      expect(child.killedSignals).toEqual([signal]);
      expect(signals.has('SIGINT')).toBe(false);
      expect(signals.has('SIGTERM')).toBe(false);
    },
  );

  it('fails safely when a child cannot be started', async () => {
    const child = new FakeChild();

    await expect(
      superviseDevProcesses([SPEC], {
        spawnProcess() {
          throw new Error('spawn failed with SECRET_TOKEN=hidden');
        },
        signalSource: new FakeSignalSource(),
      }),
    ).rejects.toBeInstanceOf(SubprocessCliError);

    expect(child.killedSignals).toEqual([]);
  });

  it('terminates sibling processes when one exits unexpectedly', async () => {
    const first = new FakeChild();
    const second = new FakeChild();
    const children = [first, second];
    let index = 0;

    const running = superviseDevProcesses(
      [SPEC, { ...SPEC, label: 'worker' }],
      {
        spawnProcess: () => children[index++]!,
        signalSource: new FakeSignalSource(),
      },
    );

    first.emitExit(7, null);

    await expect(running).rejects.toThrow('exited unexpectedly with code 7');
    expect(second.killedSignals).toEqual(['SIGTERM']);
  });
});
