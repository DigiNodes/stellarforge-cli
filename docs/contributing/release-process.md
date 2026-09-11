# Release Process

StellarForge CLI uses Semantic Versioning, Changesets, npm Trusted Publishing, and GitHub Releases.

## Safety state before first publication

Release automation is intentionally merged in a non-publishing state. The workflow can create release PRs and validate/pack release artifacts, but the npm publish job runs only when **all** of these controls are in place:

1. the `@stellarforge/cli` npm scope/package is owned by the StellarForge maintainers;
2. npm Trusted Publishing is configured for:
   - GitHub organization: `DigiNodes`
   - repository: `stellarforge-cli`
   - workflow filename: `release.yml`
   - environment: `npm-release`
   - direct `npm publish` is allowed;
3. the GitHub `npm-release` environment exists and requires maintainer approval;
4. the repository variable `NPM_PUBLISH_ENABLED` is set to `true`.

Until then, release artifacts are built, tested, inspected, and packed, but publication stops at the protected gate.

No long-lived `NPM_TOKEN` is used.

## Normal release flow

1. User-facing PRs include a Changeset when required.
2. PRs merge to `main` only after normal CI/security review.
3. `.github/workflows/release.yml` selects Changesets mode.
4. If unreleased Changesets exist, the workflow creates or updates a `release: version packages` PR.
5. Maintainers review the generated version and changelog.
6. The release PR passes normal CI/security gates and is merged.
7. The release workflow detects publish mode.
8. A read-only job rebuilds, tests, runs `npm pack --dry-run`, and creates exact packed release artifacts.
9. If publication is enabled, the protected `npm-release` environment must approve the publish job.
10. The publish job obtains an npm OIDC credential, publishes the packed artifact, then creates the matching Git tag and GitHub Release.

The publish job has `id-token: write` only where OIDC is needed. Versioning and validation jobs do not receive OIDC permission.

## Manual dry-run

Run the **Release** workflow manually with `workflow_dispatch`. The readiness job performs:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run release:dry-run
npm run changeset:status
```

This path never publishes.

## First release bootstrap

The repository starts at `0.0.0`. The CLI-038 Changeset prepares the first release PR as a minor release, producing `0.1.0`.

Do not set `NPM_PUBLISH_ENABLED=true` merely because the release PR exists. First verify npm namespace ownership and configure the trusted publisher/environment controls above.

npm Trusted Publishing currently requires a compatible hosted GitHub Actions runner, Node.js 22.14+ and npm 11.5.1+. The release job pins Node 24.8.0 and npm 11.5.1 for this reason.

## Tag and GitHub Release contract

The Changesets publish action is responsible for package publication, the package-version Git tag, and the GitHub Release. A release is considered healthy only when all three identify the same version.

After publication, verify:

- npm shows `@stellarforge/cli@<version>`;
- Git contains the matching package tag;
- the GitHub Release points to the same version/tag;
- npm displays provenance for the public package.

## Rollback and hotfixes

Published npm versions and release tags are immutable release records. Never rewrite or reuse a published version.

For a bad release:

1. disable `NPM_PUBLISH_ENABLED` immediately if further automated publication should stop;
2. if appropriate, deprecate the bad npm version with a clear message;
3. prepare a corrective Changeset;
4. ship a new patch version through the same protected release flow.

For a security hotfix, coordinate privately under `SECURITY.md`, merge the minimal reviewed fix, create a patch Changeset, and use the same protected environment/OIDC publication path.

## Required repository settings

GitHub Actions must be allowed to create pull requests for Changesets release PR automation.

The `npm-release` environment should use required reviewers and should not expose unrelated secrets. The workflow needs no npm publishing secret because authentication is OIDC-based.

Dependency Graph/Dependency Review should also be enabled at the repository level so the existing Dependency Review workflow can become an enforceable release gate.
