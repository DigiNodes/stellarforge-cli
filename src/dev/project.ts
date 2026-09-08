import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationCliError } from '../errors/errors.js';

export interface DevProcessSpec {
  readonly label: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

interface ProjectPackage {
  readonly name?: unknown;
  readonly scripts?: unknown;
}

function readProjectPackage(projectRoot: string): ProjectPackage {
  const packagePath = resolve(projectRoot, 'package.json');

  if (!existsSync(packagePath)) {
    throw new ValidationCliError(
      'No package.json was found. The dev command currently supports generated Node.js StellarForge projects.',
    );
  }

  try {
    return JSON.parse(readFileSync(packagePath, 'utf8')) as ProjectPackage;
  } catch (error) {
    throw new ValidationCliError('package.json is not valid JSON.', {
      cause: error,
    });
  }
}

function selectDevelopmentScript(scripts: Record<string, unknown>): string {
  for (const candidate of ['dev', 'start', 'start:backend']) {
    if (typeof scripts[candidate] === 'string') {
      return candidate;
    }
  }

  throw new ValidationCliError(
    'No supported development script was found. Expected one of: dev, start, start:backend.',
  );
}

export function resolveDevProcessPlan(cwd: string): readonly DevProcessSpec[] {
  const projectRoot = resolve(cwd);
  const projectPackage = readProjectPackage(projectRoot);

  if (
    projectPackage.scripts === null ||
    typeof projectPackage.scripts !== 'object' ||
    Array.isArray(projectPackage.scripts)
  ) {
    throw new ValidationCliError('package.json must define a scripts object.');
  }

  const script = selectDevelopmentScript(
    projectPackage.scripts as Record<string, unknown>,
  );
  const label =
    typeof projectPackage.name === 'string' && projectPackage.name.length > 0
      ? projectPackage.name
      : 'app';

  return [
    {
      label,
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args: ['run', script],
      cwd: projectRoot,
    },
  ];
}
