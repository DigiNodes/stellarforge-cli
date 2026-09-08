import { spawn } from 'node:child_process';
import { SubprocessCliError, ValidationCliError } from '../errors/errors.js';
import { TerminalOutput } from '../output/terminal.js';
import { buildSafeChildEnvironment } from './environment.js';
import type { DevProcessSpec } from './project.js';

interface ManagedStream {
  on(event: 'data', listener: (chunk: Buffer | string) => void): unknown;
}

export interface ManagedChildProcess {
  readonly stdout: ManagedStream;
  readonly stderr: ManagedStream;
  once(event: 'error', listener: (error: Error) => void): ManagedChildProcess;
  once(
    event: 'exit',
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): ManagedChildProcess;
  kill(signal?: NodeJS.Signals): boolean;
}

export type DevProcessSpawner = (
  spec: DevProcessSpec,
  environment: NodeJS.ProcessEnv,
) => ManagedChildProcess;

export interface DevSignalSource {
  once(signal: NodeJS.Signals, listener: () => void): unknown;
  removeListener(signal: NodeJS.Signals, listener: () => void): unknown;
}

export interface DevOrchestratorOptions {
  readonly output?: TerminalOutput;
  readonly environment?: NodeJS.ProcessEnv;
  readonly spawnProcess?: DevProcessSpawner;
  readonly signalSource?: DevSignalSource;
}

function defaultSpawnProcess(
  spec: DevProcessSpec,
  environment: NodeJS.ProcessEnv,
): ManagedChildProcess {
  return spawn(spec.command, [...spec.args], {
    cwd: spec.cwd,
    env: environment,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as unknown as ManagedChildProcess;
}

function writePrefixedLines(
  output: TerminalOutput,
  label: string,
  chunk: Buffer | string,
  isError: boolean,
): void {
  for (const line of String(chunk).split(/\r?\n/)) {
    if (line.length === 0) {
      continue;
    }

    const message = `[${label}] ${line}`;
    if (isError) {
      output.warning(message);
    } else {
      output.info(message);
    }
  }
}

export async function superviseDevProcesses(
  specs: readonly DevProcessSpec[],
  options: DevOrchestratorOptions = {},
): Promise<void> {
  if (specs.length === 0) {
    throw new ValidationCliError('No development processes are configured.');
  }

  const output = options.output ?? new TerminalOutput();
  const environment = buildSafeChildEnvironment(
    options.environment ?? process.env,
  );
  const spawnProcess = options.spawnProcess ?? defaultSpawnProcess;
  const signalSource = options.signalSource ?? process;
  const children: ManagedChildProcess[] = [];
  let shuttingDown = false;

  const stopChildren = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const child of children) {
      child.kill(signal);
    }
  };

  const handleSigint = (): void => stopChildren('SIGINT');
  const handleSigterm = (): void => stopChildren('SIGTERM');

  signalSource.once('SIGINT', handleSigint);
  signalSource.once('SIGTERM', handleSigterm);

  try {
    await new Promise<void>((resolve, reject) => {
      let remaining = specs.length;
      let settled = false;

      const fail = (message: string, cause?: Error): void => {
        if (settled) {
          return;
        }

        settled = true;
        stopChildren('SIGTERM');
        reject(
          new SubprocessCliError(
            message,
            cause === undefined ? undefined : { cause },
          ),
        );
      };

      for (const spec of specs) {
        let child: ManagedChildProcess;

        try {
          child = spawnProcess(spec, environment);
        } catch (error) {
          fail(
            `Failed to start development process '${spec.label}'.`,
            error instanceof Error ? error : undefined,
          );
          return;
        }

        children.push(child);
        child.stdout.on('data', (chunk) =>
          writePrefixedLines(output, spec.label, chunk, false),
        );
        child.stderr.on('data', (chunk) =>
          writePrefixedLines(output, spec.label, chunk, true),
        );
        child.once('error', (error) => {
          fail(`Development process '${spec.label}' failed to start.`, error);
        });
        child.once('exit', (code, signal) => {
          remaining -= 1;

          if (!shuttingDown && code !== 0) {
            fail(
              `Development process '${spec.label}' exited unexpectedly${
                code === null ? '' : ` with code ${code}`
              }${signal === null ? '' : ` after ${signal}`}.`,
            );
            return;
          }

          if (!settled && remaining === 0) {
            settled = true;
            resolve();
          }
        });
      }
    });
  } finally {
    signalSource.removeListener('SIGINT', handleSigint);
    signalSource.removeListener('SIGTERM', handleSigterm);
  }
}
