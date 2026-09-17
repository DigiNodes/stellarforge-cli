# StellarForge CLI Contributor Architecture Freeze

**Status:** Active for Stellar Wave contributor work

This document freezes the contributor-facing architecture of the post-MVP StellarForge CLI. It does not prevent improvements. It defines which boundaries contributors should extend, which surfaces require maintainer-led design, and how issues must be scoped to avoid parallel-work conflicts.

## Stable product surface

The v1 stabilization command surface is:

- `stellarforge new`
- `stellarforge doctor`
- `stellarforge dev`
- `stellarforge test`
- `stellarforge deploy` for Stellar Testnet only
- global help and version behavior

The controlled starter-template set is:

- `basic-app`
- `full-stack`
- `smart-contract`
- `api-service`

Contributor issues may improve these surfaces without casually changing their public contracts.

## Frozen architectural rules

1. Commands remain thin orchestration layers. Business/filesystem/process/network logic belongs in focused modules.
2. Project configuration remains versioned JSON at `stellarforge.config.json`; executable configuration is not introduced casually.
3. CLI option precedence remains explicit and deterministic. Network-sensitive behavior must never silently fall back to Mainnet.
4. The generator accepts controlled bundled templates only during v1 stabilization. Arbitrary remote templates, dynamic code loading, and plugin execution are not contributor extensions.
5. Filesystem writes must remain contained inside validated destinations and account for traversal, collisions, and symlinks.
6. External tools are invoked through executable/argument boundaries. Shell interpolation of untrusted input is prohibited.
7. `stellarforge deploy` remains Testnet-only until a separate architecture/security decision explicitly expands deployment scope.
8. Signing material remains outside normal project configuration and must not be printed in output/errors.
9. Exit-code and safe-error behavior remains centralized.
10. PR CI remains unprivileged. Publishing/release execution remains isolated to protected workflows and trusted refs.
11. Runtime dependencies remain intentionally minimal. Adding a runtime dependency requires explicit justification and dependency/supply-chain review.
12. Supported runtime/platform policy remains Node `>=22.13.0 <25`, npm `>=10.9.0`, with Linux/macOS/Windows coverage unless a maintainer-approved compatibility issue changes it.

## Protected/core surfaces

Changes to these paths or contracts are **maintainer-review required** and should not be redesigned as incidental work:

### Architecture and public contracts

- `docs/adr/**`
- `docs/architecture/**`
- `docs/roadmap/v1-readiness.md`
- public command names, required options, and exit semantics
- `src/commands/root.ts`
- `src/cli.ts`, `src/main.ts`, `src/version.ts`

### Security and trust boundaries

- `src/errors/**`
- `src/output/**`
- `src/config/**`
- `src/process/**`
- `src/deployment/**`
- `src/generator/validation.ts`
- `src/generator/template-generation.ts`
- `src/dev/orchestrator.ts`
- `src/dev/environment.ts`
- `SECURITY.md`
- threat-model and trust-boundary documents

### Supply chain and release

- `.github/workflows/**`
- `.github/CODEOWNERS`
- `.github/dependabot.yml`
- `.changeset/**`
- `package.json`
- `package-lock.json`
- release/versioning policy and `CHANGELOG.md`

### Controlled-template contract

- `src/generator/template-registry.ts`
- `src/generator/template-sources.ts`
- introduction/removal/renaming of a top-level `templates/*` template

A contributor issue may intentionally touch a protected surface when its scope says so. The rule is that protected changes must be explicit, narrowly scoped, tested, and maintainer-reviewed rather than emerging as opportunistic refactors.

## Contributor-friendly extension zones

Good parallel-work areas include:

- focused diagnostic improvements that preserve the diagnostic result contract;
- tests and fixtures around existing behavior;
- documentation examples and troubleshooting corrections;
- template-local README, examples, tests, and non-secret configuration improvements;
- error-message clarity that preserves exit-code categories;
- performance measurements and bounded optimizations;
- platform-specific regression tests;
- generated-project quality improvements that do not redefine the generator protocol;
- accessibility/readability of terminal text without redesigning the output abstraction.

## Explicitly gated post-v1 architecture

Do not implement these from ordinary Wave issues without a maintainer-approved architecture issue/ADR first:

- plugin architecture or marketplace;
- `stellarforge add`;
- remote template registry;
- project upgrade/migration engine;
- Mainnet deployment automation;
- hosted deployment platform;
- blockchain indexer internals;
- smart-contract auditing engine;
- AI-assisted scaffolding;
- monorepo/workspace management;
- domain-specific payment, identity, marketplace, DAO, RWA, or enterprise template families.

## Parallel-contribution rules

Each Wave issue must declare:

- primary workstream;
- expected file ownership/scope;
- dependencies and blockers;
- whether a protected surface is touched;
- tests required;
- acceptance criteria;
- points/difficulty/priority.

Issues that edit the same core file should be sequenced unless their changes are demonstrably independent. Broad refactors must not be hidden inside feature, docs, or test issues. If implementation reveals an architectural conflict, stop and raise it before redesigning the boundary.

## Review triggers

Maintainer architecture/security review is required when a change:

- adds a command or changes command semantics;
- adds a runtime dependency;
- changes configuration schema/precedence;
- expands filesystem write scope;
- changes subprocess/environment handling;
- handles a new credential/secret type;
- adds network access or expands deployment networks;
- adds/removes/renames a controlled template;
- changes CI permissions, release behavior, or publication controls;
- changes an ADR, threat boundary, or v1 readiness requirement.
