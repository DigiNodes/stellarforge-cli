import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateIdentityAlias } from '../config/schema.js';
import type { DevProcessSpec } from '../dev/project.js';
import { ValidationCliError } from '../errors/errors.js';

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

  validateIdentityAlias(input.source);

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
