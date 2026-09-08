import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createDeployCommand } from '../src/commands/deploy.js';
import type { ManagedChildProcess } from '../src/dev/orchestrator.js';
import { SubprocessCliError } from '../src/errors/errors.js';
import { createCapturedTerminalOutput } from './helpers/index.js';

class DeployChild implements ManagedChildProcess {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  #exitListener:
    | ((code: number | null, signal: NodeJS.Signals | null) => void)
    | undefined;

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

describe('deploy command', () => {
  it('forwards explicit Testnet and identity input to a safe deployment plan', async () => {
    const child = new DeployChild();
    const captured = createCapturedTerminalOutput();
    let received:
      | { readonly cwd: string; readonly network: string; readonly source: string }
      | undefined;
    const command = createDeployCommand({
      cwd: () => '/workspace',
      output: captured.output,
      resolvePlan(input) {
        received = input;
        return [
          {
            label: 'stellar:deploy',
            command: 'stellar',
            args: [
              'contract',
              'deploy',
              '--source-account',
              input.source,
              '--network',
              input.network,
            ],
            cwd: input.cwd,
          },
        ];
      },
      spawnProcess: () => child,
    });

    const running = command.parseAsync([
      'node',
      'deploy',
      '--network',
      'testnet',
      '--source',
      'deployer',
    ]);
    child.stdout.write('CABC123\n');
    child.exit(0);
    await running;

    expect(received).toEqual({
      cwd: '/workspace',
      network: 'testnet',
      source: 'deployer',
    });
    expect(captured.stdoutText()).toContain('Deploying smart contract to Stellar Testnet.');
    expect(captured.stdoutText()).toContain('[stellar:deploy] CABC123');
  });

  it('preserves a failed Stellar CLI deployment as a subprocess failure', async () => {
    const child = new DeployChild();
    const command = createDeployCommand({
      cwd: () => '/workspace',
      resolvePlan: () => [
        {
          label: 'stellar:deploy',
          command: 'stellar',
          args: ['contract', 'deploy', '--source-account', 'alice', '--network', 'testnet'],
          cwd: '/workspace',
        },
      ],
      spawnProcess: () => child,
    });

    const running = command.parseAsync([
      'node',
      'deploy',
      '--network',
      'testnet',
      '--source',
      'alice',
    ]);
    child.exit(2);

    await expect(running).rejects.toBeInstanceOf(SubprocessCliError);
  });
});
