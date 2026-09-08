import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DevProcessSpec } from '../dev/project.js';
import { ValidationCliError } from '../errors/errors.js';

const SAFE_IDENTITY_ALIAS = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const STELLAR_ACCOUNT_OR_SECRET_STRKEY = /^[GS][A-Z2-7]{55}$/;

export interface TestnetDeploymentInput {
  readonly cwd: string;
  readonly network: string;
  readonly source: string;
}

export function resolveTestnetDeploymentPlan(
  input: TestnetDeploymentInput,
): readonly DevProcessSpec[] {
  if (input.network !== 'testnet') {
    throw new ValidationCliError(
      'StellarForge deploy supports only the explicit `--network testnet` target in the MVP.',
    );
  }

  if (
    STELLAR_ACCOUNT_OR_SECRET_STRKEY.test(input.source) ||
    !SAFE_IDENTITY_ALIAS.test(input.source)
  ) {
    throw new ValidationCliError(
      'Deployment source must be a named Stellar CLI identity alias. Raw secret keys, seed phrases, public keys, and path-like values are not accepted.',
    );
  }

  const projectRoot = resolve(input.cwd);
  if (!existsSync(resolve(projectRoot, 'Cargo.toml'))) {
    throw new ValidationCliError(
      'No Cargo.toml workspace was found. MVP deployment currently supports generated Stellar smart-contract projects only.',
    );
  }

  return [
    {
      label: 'stellar:deploy',
      command: process.platform === 'win32' ? 'stellar.exe' : 'stellar',
      args: [
        'contract',
        'deploy',
        '--source-account',
        input.source,
        '--network',
        'testnet',
      ],
      cwd: projectRoot,
    },
  ];
}
