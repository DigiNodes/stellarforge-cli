const SAFE_ENVIRONMENT_KEYS = [
  'PATH',
  'Path',
  'PATHEXT',
  'SystemRoot',
  'ComSpec',
  'HOME',
  'USERPROFILE',
  'TMPDIR',
  'TMP',
  'TEMP',
  'TERM',
  'COLORTERM',
  'NO_COLOR',
  'FORCE_COLOR',
  'CI',
  'NODE_ENV',
  'PORT',
  'API_HOST',
  'API_PORT',
  'BACKEND_PORT',
  'STELLAR_NETWORK',
  'STELLAR_HORIZON_URL',
  'STELLAR_RPC_URL',
] as const;

export function buildSafeChildEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};

  for (const key of SAFE_ENVIRONMENT_KEYS) {
    const value = source[key];

    if (value !== undefined) {
      environment[key] = value;
    }
  }

  return environment;
}
