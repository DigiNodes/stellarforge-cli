export interface NpmInvocation {
  readonly command: string;
  readonly args: readonly string[];
}

export function createNpmInvocation(
  args: readonly string[],
): NpmInvocation {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm', ...args],
    };
  }

  return {
    command: 'npm',
    args: [...args],
  };
}
