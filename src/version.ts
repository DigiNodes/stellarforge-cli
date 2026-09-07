import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export class CliVersionResolutionError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      'Unable to resolve StellarForge CLI version from package metadata.',
      options,
    );
    this.name = 'CliVersionResolutionError';
  }
}

function loadPackageMetadata(): unknown {
  return require('../package.json');
}

export function resolveCliVersion(
  loader: () => unknown = loadPackageMetadata,
): string {
  let metadata: unknown;

  try {
    metadata = loader();
  } catch (cause) {
    throw new CliVersionResolutionError({ cause });
  }

  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    !('version' in metadata) ||
    typeof metadata.version !== 'string' ||
    metadata.version.trim().length === 0
  ) {
    throw new CliVersionResolutionError();
  }

  return metadata.version;
}
