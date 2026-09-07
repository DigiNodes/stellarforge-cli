# Installation

StellarForge CLI is under active MVP development and may not yet be published to npm. Until a stable package is released, contributors should use the repository locally.

## Contributor Setup

Prerequisites will be finalized with CLI-001. The intended baseline is a supported Node.js release and npm.

```bash
git clone https://github.com/DigiNodes/stellarforge-cli.git
cd stellarforge-cli
npm ci
```

After the package foundation lands, the standard local checks will be:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Do not install undocumented global dependencies. Stellar-specific tools required by individual commands will be documented with those commands and validated by `stellarforge doctor` where applicable.

## Package Installation

The npm package name and stable installation command will be documented when publishing begins. Do not assume an unpublished package name.
