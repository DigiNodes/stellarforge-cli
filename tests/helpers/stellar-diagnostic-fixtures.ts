/**
 * Diagnostic test fixtures for Stellar CLI version parsing and execution.
 *
 * Scope:
 * - Plain semantic versions and whitespace variants
 * - Supported version floor (>=27.1.0) and unsupported older baselines
 * - Unexpected prefixes, suffixes, and malformed version shapes
 * - Non-zero exit codes and missing executable conditions
 * - Protected contract surface (no legacy soroban fallback, no identity/config inspection)
 */

export interface SupportedVersionFixture {
  readonly rawOutput: string;
  readonly expectedVersion: string;
  readonly description: string;
}

export interface UnsupportedVersionFixture {
  readonly rawOutput: string;
  readonly extractedVersion: string;
  readonly description: string;
}

export interface MalformedOutputFixture {
  readonly rawOutput: string;
  readonly description: string;
}

export interface NonZeroExecutionFixture {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly description: string;
}

export interface MissingExecutableFixture {
  readonly error: Error;
  readonly stderr: string;
  readonly description: string;
}

/**
 * Fixtures that must produce status 'pass' and match the expected version.
 */
export const SUPPORTED_STELLAR_VERSION_FIXTURES: readonly SupportedVersionFixture[] =
  [
    {
      rawOutput: '27.1.0\n',
      expectedVersion: '27.1.0',
      description: 'exact minimum supported baseline version',
    },
    {
      rawOutput: '27.1.1\n',
      expectedVersion: '27.1.1',
      description: 'supported patch increment',
    },
    {
      rawOutput: '27.2.0\n',
      expectedVersion: '27.2.0',
      description: 'supported minor increment',
    },
    {
      rawOutput: '28.0.0\n',
      expectedVersion: '28.0.0',
      description: 'supported next major version',
    },
    {
      rawOutput: '28.1.4\n',
      expectedVersion: '28.1.4',
      description: 'supported newer major and minor combination',
    },
    {
      rawOutput: '29.0.0\n',
      expectedVersion: '29.0.0',
      description: 'supported future protocol 29 release',
    },
    {
      rawOutput: '100.0.0\n',
      expectedVersion: '100.0.0',
      description: 'supported triple-digit major release',
    },
    {
      rawOutput: '27.10.25\n',
      expectedVersion: '27.10.25',
      description: 'supported double-digit minor and patch segments',
    },
    {
      rawOutput: 'v27.1.0\n',
      expectedVersion: '27.1.0',
      description: 'supported version with leading v prefix',
    },
    {
      rawOutput: 'v28.0.0\n',
      expectedVersion: '28.0.0',
      description: 'newer major version with leading v prefix',
    },
    {
      rawOutput: '   27.1.0\n',
      expectedVersion: '27.1.0',
      description: 'leading whitespace before semantic version',
    },
    {
      rawOutput: '27.1.0   \n',
      expectedVersion: '27.1.0',
      description: 'trailing whitespace before newline',
    },
    {
      rawOutput: '27.1.0\r\n',
      expectedVersion: '27.1.0',
      description: 'Windows CRLF line terminator',
    },
    {
      rawOutput: '  \t27.1.0\t  \r\n',
      expectedVersion: '27.1.0',
      description: 'mixed tabs and spaces surrounding version',
    },
    {
      rawOutput: '\n\n27.1.0\n\n',
      expectedVersion: '27.1.0',
      description: 'multiple leading and trailing newlines',
    },
    {
      rawOutput: '  v27.1.0 \r\n',
      expectedVersion: '27.1.0',
      description: 'whitespace surrounding leading v version',
    },
    {
      rawOutput: '27.1.0-rc.1\n',
      expectedVersion: '27.1.0',
      description: 'prerelease release-candidate suffix',
    },
    {
      rawOutput: '27.1.0-beta.2\n',
      expectedVersion: '27.1.0',
      description: 'prerelease beta suffix',
    },
    {
      rawOutput: '27.1.0-alpha.1\n',
      expectedVersion: '27.1.0',
      description: 'prerelease alpha suffix',
    },
    {
      rawOutput: 'v28.0.0-preview.3\n',
      expectedVersion: '28.0.0',
      description: 'leading v with prerelease preview suffix',
    },
    {
      rawOutput: '27.1.0+build.42\n',
      expectedVersion: '27.1.0',
      description: 'semver build metadata suffix',
    },
    {
      rawOutput: '27.1.0-rc.1+sha.abcdef\n',
      expectedVersion: '27.1.0',
      description: 'combined prerelease and build metadata suffix',
    },
  ];

/**
 * Fixtures that parse as valid semver but fall below the >=27.1.0 baseline.
 * Must produce status 'fail' and include the remediation notice.
 */
export const UNSUPPORTED_STELLAR_VERSION_FIXTURES: readonly UnsupportedVersionFixture[] =
  [
    {
      rawOutput: '27.0.0\n',
      extractedVersion: '27.0.0',
      description: 'version immediately below the 27.1.0 baseline',
    },
    {
      rawOutput: '27.0.9\n',
      extractedVersion: '27.0.9',
      description: 'highest patch of earlier minor release',
    },
    {
      rawOutput: '26.0.0\n',
      extractedVersion: '26.0.0',
      description: 'earlier protocol 26 major version',
    },
    {
      rawOutput: '20.0.0\n',
      extractedVersion: '20.0.0',
      description: 'early Soroban transition release',
    },
    {
      rawOutput: '0.1.0\n',
      extractedVersion: '0.1.0',
      description: 'legacy development release',
    },
    {
      rawOutput: 'v27.0.1\n',
      extractedVersion: '27.0.1',
      description: 'unsupported version with leading v',
    },
    {
      rawOutput: '27.0.0-rc.1\n',
      extractedVersion: '27.0.0',
      description: 'unsupported version with prerelease tag',
    },
  ];

/**
 * Fixtures that cannot be parsed as valid Stellar CLI versions.
 * Must produce status 'fail' with message 'Stellar CLI returned an unrecognized version.'
 */
export const MALFORMED_STELLAR_OUTPUT_FIXTURES: readonly MalformedOutputFixture[] =
  [
    {
      rawOutput: '27\n',
      description: 'single major number without minor or patch',
    },
    {
      rawOutput: '27.1\n',
      description: 'two-part version without patch segment',
    },
    {
      rawOutput: 'v27\n',
      description: 'leading v with single major number',
    },
    {
      rawOutput: 'v27.1\n',
      description: 'leading v with missing patch segment',
    },
    {
      rawOutput: '27.\n',
      description: 'trailing dot after major segment',
    },
    {
      rawOutput: '27.1.\n',
      description: 'trailing dot after minor segment',
    },
    {
      rawOutput: '27.x.1\n',
      description: 'alphabetic wildcard in minor position',
    },
    {
      rawOutput: 'vA.B.C\n',
      description: 'non-numeric alphabetic placeholders',
    },
    {
      rawOutput: '27.1.0a\n',
      description: 'alphabetic character appended directly to patch',
    },
    {
      rawOutput: '27.1.0.0\n',
      description: 'four-part quad versioning',
    },
    {
      rawOutput: 'stellar 27.1.0\n',
      description: 'binary name prefix before version',
    },
    {
      rawOutput: 'stellar-cli 27.1.0\n',
      description: 'hyphenated binary prefix before version',
    },
    {
      rawOutput: 'version 27.1.0\n',
      description: 'word prefix before version',
    },
    {
      rawOutput: 'Stellar CLI v27.1.0\n',
      description: 'full sentence prefix before version',
    },
    {
      rawOutput: '27.1.0 (built 2026-01-01)\n',
      description: 'unexpected trailing parenthetical build details',
    },
    {
      rawOutput: '27.1.0 extra-tokens\n',
      description: 'unexpected trailing words after version',
    },
    {
      rawOutput: 'stellar-cli unknown\n',
      description: 'unrecognized keyword string',
    },
    {
      rawOutput: 'error: unknown command\n',
      description: 'error message string output to stdout',
    },
    {
      rawOutput: '',
      description: 'completely empty stdout',
    },
    {
      rawOutput: '   \t  \r\n',
      description: 'whitespace and newline only stdout',
    },
    {
      rawOutput: '{"version": "27.1.0"}\n',
      description: 'JSON structured object output',
    },
    {
      rawOutput: 'version: 27.1.0\n',
      description: 'YAML structured key-value output',
    },
    {
      rawOutput: '<html><body>502 Bad Gateway</body></html>\n',
      description: 'HTML markup error output',
    },
  ];

/**
 * Fixtures for process execution returning non-zero exit codes.
 * Must produce status 'fail' with message 'Stellar CLI is unavailable or could not be executed.'
 */
export const NON_ZERO_EXECUTION_FIXTURES: readonly NonZeroExecutionFixture[] = [
  {
    status: 1,
    stdout: '',
    stderr: 'error: generic process failure\n',
    description: 'exit code 1 general error',
  },
  {
    status: 2,
    stdout: '',
    stderr: 'error: unrecognized option --only-version\n',
    description: 'exit code 2 CLI usage / flag failure',
  },
  {
    status: 126,
    stdout: '',
    stderr: 'stellar: Permission denied\n',
    description: 'exit code 126 command invoked cannot execute',
  },
  {
    status: 127,
    stdout: '',
    stderr: 'stellar: command not found\n',
    description: 'exit code 127 command not found',
  },
  {
    status: 137,
    stdout: '',
    stderr: 'Killed\n',
    description: 'exit code 137 terminated by SIGKILL',
  },
  {
    status: 1,
    stdout: '27.1.0\n',
    stderr: 'panic: runtime internal error\n',
    description:
      'non-zero exit code takes precedence even when stdout contains valid version',
  },
];

/**
 * Fixtures for process spawning failures (e.g. executable missing from PATH).
 */
export const MISSING_EXECUTABLE_FIXTURES: readonly MissingExecutableFixture[] =
  [
    {
      error: new Error('spawn stellar ENOENT'),
      stderr: '',
      description: 'executable missing from system PATH',
    },
    {
      error: new Error('spawn stellar EACCES'),
      stderr: 'permission denied',
      description: 'executable binary lacks execution permissions',
    },
    {
      error: new Error('spawn stellar ENOENT SECRET_PASSPHRASE=do-not-leak'),
      stderr: 'SENSITIVE_KEY=do-not-leak',
      description:
        'execution failure containing potential secrets to test redaction',
    },
  ];
