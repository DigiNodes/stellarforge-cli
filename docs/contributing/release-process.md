# Release Process

StellarForge CLI uses the release direction defined by ADR-0003: Semantic Versioning, Changesets, protected automation, Git tags, and GitHub Releases, with package-registry publishing added when the CLI is ready for distribution.

## Contributor Responsibilities

Release-impacting PRs include an appropriate Changeset. Documentation-only, test-only, and internal CI changes usually do not require one unless maintainers request release communication.

## Maintainer Flow

1. Merge reviewed contributor PRs to `main`.
2. Aggregate pending Changesets.
3. Review generated version/changelog updates.
4. Ensure required CI/security checks pass.
5. Merge the release PR.
6. Publish only through the approved protected workflow.
7. Verify package, tag, GitHub Release, and provenance where supported.

## Pre-1.0

Breaking changes remain possible while the CLI contract stabilizes, but they must be intentional, documented, and communicated. Versions should advance according to planned milestone outcomes rather than arbitrary issue counts.

## Security

Do not publish from contributor-controlled privileged contexts. Prefer short-lived/OIDC registry authentication where supported, least-privilege Actions permissions, and reviewed third-party Actions.
