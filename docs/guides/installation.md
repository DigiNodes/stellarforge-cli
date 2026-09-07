# Installation

StellarForge CLI is under active MVP development and is not yet treated as a stable published npm package. Contributors should use the repository locally until the protected release workflow is established.

## Contributor Prerequisites

The CLI foundation supports maintained Node.js LTS lines covered by the package engine range:

- Node.js `>=22.13.0 <25`
- npm `>=10.9.0`
- repository toolchain metadata records npm `10.9.2`

Node.js 22 and Node.js 24 are the intended supported LTS majors for the current foundation. The minimum Node.js 22 patch level is aligned with the CLI's current linting/tooling dependency requirements. Do not use an end-of-life Node release for development or CI.

## Contributor Setup

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

## Local CLI Invocation

Build the CLI before invoking the compiled executable from a source checkout:

```bash
npm run build
node dist/cli.js
```

The package metadata maps the installed command name `stellarforge` to `dist/cli.js`. When the package is eventually installed or linked through an approved workflow, package managers can expose that executable as `stellarforge`.

At the CLI-002 stage, successful startup intentionally produces no command output. The root command, global help, and invalid-command behavior are implemented separately in CLI-003.

Do not install undocumented global dependencies. Stellar-specific tools required by individual commands will be documented with those commands and validated by `stellarforge doctor` where applicable.

## Package Publication

The package is intentionally marked private during the foundation phase to prevent accidental publication. The final public npm package identity and installation command must be verified as part of release-readiness work before the private guard is removed.
