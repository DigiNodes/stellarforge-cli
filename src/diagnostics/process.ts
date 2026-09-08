import { spawnSync } from 'node:child_process';

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
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ...(result.error === undefined ? {} : { error: result.error }),
  };
};
