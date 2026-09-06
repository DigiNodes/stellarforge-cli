# ADR-0003: Release and Versioning Strategy

- **Status:** Proposed
- **Date:** 2026-09-06
- **Decision owners:** StellarForge Core Team

## Context

StellarForge CLI is intended to become a versioned developer tool distributed as a Node.js package. Contributors need a predictable way to communicate release impact, maintainers need auditable version/changelog updates, and package publication must avoid unnecessary long-lived credentials.

The project is currently pre-1.0 and its public command/configuration contracts will evolve as the MVP is implemented.

## Decision

Adopt the following release strategy:

1. Semantic Versioning for public versions.
2. Changesets for contributor release intent, version updates, and changelog generation.
3. npm remains the selected package-manager/release ecosystem unless changed by a separate architecture decision.
4. GitHub Actions will automate the release flow after the package foundation exists and the workflow can be tested safely.
5. Git tags and GitHub Releases will correspond to published versions.
6. npm Trusted Publishing/OIDC and package provenance should be preferred when package publication begins and the supported environment permits it.
7. Release automation must be protected from untrusted pull-request execution and use least-privilege permissions.

## Version Semantics

### Patch

Use for backward-compatible bug fixes and compatible internal improvements that affect the shipped package.

### Minor

Use for backward-compatible new commands, flags, templates, or capabilities.

Before v1.0, intentional breaking changes may also require a minor version increase because the public contract is still stabilizing. They must still be clearly identified as breaking changes in release communication.

### Major

After v1.0, use for incompatible changes to stable command syntax, configuration, supported generated-project contracts, or other public behavior.

## Changeset Requirement

A changeset is normally required when a PR changes published or user-visible behavior, including:

- user-facing bug fixes;
- commands or flags;
- command behavior;
- shipped templates;
- breaking changes;
- meaningful user-facing performance changes.

A changeset is normally unnecessary for documentation-only work, tests that do not change shipped behavior, internal CI maintenance, repository templates, or non-shipping refactors.

Maintainers may override this default when release communication warrants it.

## Release Flow

1. A contributor opens a PR.
2. The PR declares release impact and includes a changeset where required.
3. Required CI, security checks, and reviews pass.
4. The PR merges to `main`.
5. Release automation aggregates pending changes into a release PR.
6. Maintainers review generated versions and changelog content.
7. The release PR merges.
8. Protected automation publishes the package when publication is enabled.
9. The corresponding Git tag/GitHub Release is created or verified.

## Changelog Ownership

`CHANGELOG.md` is repository-specific and communicates notable released changes. Changesets drive release entries, but maintainers remain responsible for clarity and accuracy.

## Release Security

Release automation must:

- use explicit least-privilege workflow permissions;
- avoid privileged execution of contributor-controlled code;
- avoid long-lived npm publishing secrets when trusted publishing is available;
- protect any required release environment/credentials;
- review/pin third-party Actions according to project policy;
- publish only after required CI/security gates succeed.

## Rollback and Hotfixes

Published package versions are immutable. A bad release should be corrected with a new version rather than rewriting an existing version/tag.

Urgent compatible fixes use a patch release. Security fixes follow the vulnerability-coordination process in `SECURITY.md` and may use private preparation before a public release.

## Consequences

### Positive

- contributors communicate release impact close to the code change;
- versions and changelogs become auditable;
- releases are reproducible and easier to automate;
- secure tokenless publication can be adopted when publishing begins.

### Trade-offs

- contributors must learn when a changeset is appropriate;
- maintainers must review generated release metadata;
- pre-1.0 breaking-change communication requires discipline beyond version numbers alone;
- release automation introduces its own supply-chain/security surface.

## Alternatives Considered

### Manual version and changelog updates

Rejected because it becomes error-prone as contribution volume increases.

### Conventional-commit-only automated releases

Not selected for the MVP because explicit changeset files make release intent reviewable per PR without forcing commit-message conventions to carry the entire release model.

## Follow-up Work

- add `.changeset/config.json` and contributor guidance;
- establish package metadata before first package release;
- implement release automation only after the package foundation exists;
- configure trusted publishing/provenance before production npm publication where supported;
- document release operations in `docs/contributing/release-process.md`.
