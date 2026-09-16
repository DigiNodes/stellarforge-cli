# Installation

StellarForge CLI has completed its initial MVP implementation and the repository contains protected release automation. The source is versioned at `0.1.0`, but the first public npm publication is still pending the one-time registry and Trusted Publishing setup tracked in REL-001.

Until that publication is verified, use a source checkout for development and evaluation rather than assuming `@stellarforge/cli` is available from the npm registry.

## Contributor prerequisites

The current runtime support contract is:

- Node.js `>=22.13.0 <25`;
- npm `>=10.9.0`;
- supported Node.js majors: 22 and 24;
- Linux, macOS, and Windows are exercised by the repository CI matrix.

Repository toolchain metadata currently records npm `10.9.2`.

See [Platform Support](../reference/platform-support.md). Do not use an end-of-life or unsupported Node release for development or CI.

## Contributor setup

```bash
git clone https://github.com/DigiNodes/stellarforge-cli.git
cd stellarforge-cli
npm ci
```

Run the complete local validation set before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

The repository uses npm and commits `package-lock.json` for deterministic installation. Do not substitute another package manager without an explicit project decision.

## Local CLI invocation

Build the CLI before invoking the compiled executable from a source checkout:

```bash
npm run build
node dist/cli.js --help
node dist/cli.js --version
```

The package metadata maps the installed command name `stellarforge` to `dist/cli.js`. For local executable testing, npm can link the built checkout:

```bash
npm link --ignore-scripts
stellarforge --help
stellarforge --version
```

Local linking modifies the developer's npm environment. It is not required for normal repository tests and should not be used in privileged/global system contexts.

The implemented command behavior is documented in the [Command Reference](../reference/commands.md).

Do not install undocumented global dependencies. Stellar-specific tools required by individual commands are documented with those commands and validated by `stellarforge doctor` where applicable.

## Public npm installation

The package metadata is publication-ready (`private: false`), and protected release automation is implemented. However, **registry availability must not be assumed until REL-001 is complete and the first protected OIDC publication has been verified**.

After publication, the public installation instructions should be updated using the verified npm package identity and supported install command. Do not add an npm install example here before that registry verification.

## Release security state

The release workflow is designed around:

- Changesets;
- release artifact validation;
- npm Trusted Publishing/OIDC;
- a protected GitHub `npm-release` environment;
- no long-lived `NPM_TOKEN`;
- npm provenance where supported.

The remaining one-time administrative work is tracked by REL-001 and includes the npm namespace bootstrap, Trusted Publisher configuration, protected GitHub environment, publication variable, and first protected publication.

See [Release Process](../contributing/release-process.md) for the complete release contract.
