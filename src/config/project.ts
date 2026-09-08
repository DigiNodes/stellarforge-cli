import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationCliError } from '../errors/errors.js';
import {
  validateIdentityAlias,
  validateStellarForgeConfig,
  type StellarForgeConfig,
} from './schema.js';

export const PROJECT_CONFIG_FILENAME = 'stellarforge.config.json';
const MAX_CONFIG_BYTES = 64 * 1024;

export interface ProjectConfigOverrides {
  readonly network?: string;
  readonly identity?: string;
}

export interface ResolvedProjectConfig {
  readonly network?: string;
  readonly identity?: string;
}

export function loadProjectConfig(cwd: string): StellarForgeConfig | undefined {
  const projectRoot = resolve(cwd);
  const configPath = resolve(projectRoot, PROJECT_CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return undefined;
  }

  let metadata;
  try {
    metadata = lstatSync(configPath);
  } catch (error) {
    throw new ValidationCliError(
      'Unable to inspect stellarforge.config.json.',
      { cause: error },
    );
  }

  if (metadata.isSymbolicLink()) {
    throw new ValidationCliError(
      'stellarforge.config.json must be a regular project file, not a symbolic link.',
    );
  }

  if (!metadata.isFile()) {
    throw new ValidationCliError(
      'stellarforge.config.json must be a regular project file.',
    );
  }

  if (metadata.size > MAX_CONFIG_BYTES) {
    throw new ValidationCliError(
      'stellarforge.config.json is larger than the 64 KiB MVP limit.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf8')) as unknown;
  } catch (error) {
    throw new ValidationCliError(
      'stellarforge.config.json is not valid JSON.',
      { cause: error },
    );
  }

  return validateStellarForgeConfig(parsed);
}

export function resolveProjectConfig(
  cwd: string,
  overrides: ProjectConfigOverrides = {},
): ResolvedProjectConfig {
  const projectConfig = loadProjectConfig(cwd);

  const identity =
    overrides.identity === undefined
      ? projectConfig?.identity
      : validateIdentityAlias(overrides.identity);
  const network = overrides.network ?? projectConfig?.network;

  return {
    ...(network === undefined ? {} : { network }),
    ...(identity === undefined ? {} : { identity }),
  };
}
