import { spawnSync } from 'node:child_process';

export const DIAGNOSTIC_COMMAND_TIMEOUT_MS = 5_000;

export interface CommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: Error;
}

export type RunCommand = (
  executable: string,
  args: readonly string[],
) => CommandResult;

export const runCommand: RunCommand = (executable, args) => {
  const result = spawnSync(executable, [...args], {
    encoding: 'utf8',
    shell: false,
    timeout: DIAGNOSTIC_COMMAND_TIMEOUT_MS,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ...(result.error === undefined ? {} : { error: result.error }),
  };
};
