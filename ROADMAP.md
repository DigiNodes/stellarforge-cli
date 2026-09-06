# StellarForge CLI Roadmap

This roadmap describes the planned path to the StellarForge CLI v1.0 MVP. It is directional rather than a promise of fixed dates. Scope may change through accepted architecture decisions, security findings, contributor feedback, and implementation evidence.

## v0.1 — CLI Foundation

Establish a secure, testable, contributor-ready CLI core.

- TypeScript/Node.js project foundation
- CLI executable and root command
- global help and version behavior
- terminal output and centralized error handling
- test, lint, format, type-check, and build foundation
- CI and security checks
- Changesets and changelog baseline
- contributor workflow and repository documentation

## v0.2 — Project Generator & Templates

Deliver `stellarforge new <project-name>` with controlled project generation.

Initial MVP templates:

- Basic App
- Full Stack App
- Stellar smart contract
- API Service

The milestone also covers project-name validation, destination/path safety, overwrite policy, failure handling, and template tests.

## v0.3 — Configuration & Diagnostics

Deliver a predictable configuration model and `stellarforge doctor`.

Planned diagnostics include the tooling actually required by supported workflows, such as Node.js, npm, Git, Rust/Cargo, the current Stellar CLI, and Docker where applicable.

## v0.4 — Development & Testing Commands

Deliver the MVP forms of:

- `stellarforge dev`
- `stellarforge test`

Focus areas include process lifecycle management, logs, signals, exit codes, cleanup, and supported test orchestration.

## v0.5 — Stellar Testnet Deployment

Deliver guarded deployment orchestration for Stellar Testnet through `stellarforge deploy`.

Mainnet deployment is explicitly outside this milestone.

## v0.6 — Security, Documentation & DX Hardening

Harden the complete MVP through:

- threat-model review
- dependency and supply-chain hardening
- cross-platform validation
- installation and Quick Start validation
- command/configuration reference documentation
- usability, performance, and error-message improvements

## v0.7–v0.9 — MVP Stabilization

Reserved for integration fixes, compatibility work, release candidates, security remediation, documentation completion, and pre-1.0 breaking adjustments discovered through real use.

These versions will not be filled with artificial features merely to advance version numbers.

## v1.0 — Stable CLI MVP

The v1.0 release is reached when the PRD definition of done is satisfied and release/security gates are met.

## Post-v1 Candidates

The following are intentionally not MVP commitments:

- plugin architecture
- `stellarforge add` or package/module installation commands
- remote template registry
- project upgrade tooling
- advanced deployment pipelines
- workspace management
- AI-assisted scaffolding

Major post-v1 capabilities require their own design work and architecture decisions before implementation.
