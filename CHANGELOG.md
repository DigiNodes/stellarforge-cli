# Changelog

All notable changes to StellarForge CLI will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/) and uses Changesets to capture release intent and generate version/changelog updates.

## 0.1.1

### Patch Changes

- 1a83ca2: Report unknown commands as `unknown command` with a suggestion and the available command list, map subcommand usage errors (such as unknown options) to the validation exit code `2` with a one-line `--help` hint, and redact secret-like values (Stellar secret keys, seed phrases, tokens, passwords) from supervised subprocess output, including values split across output chunks.
- 3398eae: Return the doctor diagnostic exit code when environment checks fail.

## 0.1.0 — 2026-09-11

### Added

- Initial public StellarForge CLI MVP foundation and command architecture.
- `stellarforge new` with controlled Basic App, Full Stack, Smart Contract, and API Service templates.
- `stellarforge doctor` diagnostics for Node.js, npm, Git, Rust, Cargo, Stellar CLI, and Docker.
- `stellarforge dev` safe local process orchestration.
- `stellarforge test` unified Node/Cargo test execution.
- `stellarforge deploy` guarded Stellar Testnet smart-contract deployment.
- Versioned `stellarforge.config.json` project configuration with secret-safe validation.
- Cross-platform Linux, macOS, and Windows validation.
- Deterministic linked-CLI end-to-end smoke workflow.
- Changesets-based release management and protected npm/GitHub release automation.
- CodeQL, dependency review configuration, Dependabot, CODEOWNERS, OpenSSF Scorecard, threat modeling, and secure contributor workflows.

### Security

- Uses argument-array subprocess execution with `shell: false`.
- Rejects path traversal, unsafe overwrite targets, raw Stellar StrKeys, secret-like configuration fields, and unsupported deployment networks.
- Keeps signing material in Stellar CLI identity management rather than project configuration.
- Bounds diagnostic subprocess execution time.
- Publishes through npm Trusted Publishing/OIDC once registry bootstrap is completed.

## [Unreleased]

No unreleased user-facing changes yet.
