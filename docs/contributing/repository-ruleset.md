# Main Branch Repository Ruleset

This document defines the intended GitHub repository ruleset for the `main` branch of StellarForge CLI.

The ruleset is an administrative repository setting. This file is the maintainers' source of truth for what should be configured; it does not itself enforce the settings.

## Target

Apply the ruleset to the default branch:

- `main`

Do not apply the same restrictions indiscriminately to contributor branches.

## Pull Request Requirements

Configure `main` so changes must arrive through a pull request.

Require:

- at least **1 approving review** before merge;
- **code-owner review** for paths covered by `.github/CODEOWNERS`;
- dismissal of stale approvals when new commits are pushed;
- resolution of all review conversations before merge;
- the branch to be up to date with `main` before merge when GitHub can enforce this without creating an impractical queue.

Do not allow ordinary contributors to bypass these requirements by pushing directly to `main`.

## Required Status Checks

Only require checks that are already implemented and reliably run on pull requests.

### Required now

- `Quality` — from `.github/workflows/ci.yml`
- `CodeQL` — from `.github/workflows/codeql.yml`

`Quality` covers the committed-lockfile install, typecheck, lint, formatting, tests, and build. `CodeQL` covers JavaScript/TypeScript static security analysis.

### Deferred until enabled and verified

- `Dependency Review` — from `.github/workflows/dependency-review.yml`

Do **not** make `Dependency Review` a required check until all of the following are true:

1. GitHub Dependency Graph is enabled for the repository;
2. the dependency-review workflow is merged to `main`;
3. the check has completed successfully on a representative pull request.

Requiring a check before those conditions are met would make the branch unnecessarily unmergeable.

### Not a required pull-request check

- OpenSSF Scorecard

The Scorecard workflow runs on trusted `main`/scheduled contexts rather than pull requests because it uses result-publication permissions. It should be monitored as a repository security signal, not configured as a PR merge requirement.

## Branch Integrity

Configure the ruleset to:

- block force pushes to `main`;
- block deletion of `main`;
- require pull requests rather than direct updates;
- prevent non-fast-forward history rewriting through ordinary contributor access.

Signed commits are not required by the current project policy. Do not introduce that requirement without a separate decision because it would change contributor onboarding and tooling expectations.

## Sensitive Changes

CODEOWNERS identifies security-, release-, dependency-, workflow-, and other trust-boundary-sensitive paths. The ruleset should require code-owner approval so those ownership declarations become enforceable rather than advisory.

Security-sensitive changes may require more than the minimum one approval at maintainer discretion even if GitHub's baseline ruleset only encodes one required approval.

## Bypass / Emergency Access

If a ruleset bypass is configured, keep it narrow:

- only authorized repository administrators/maintainers may bypass;
- bypass should be used only for genuine repository recovery or urgent incident response;
- bypass activity must remain visible in GitHub's audit/history surfaces;
- normal feature delivery, convenience, or failing tests are not valid bypass reasons;
- follow-up review should occur after any emergency bypass.

Do not grant broad organization-wide or contributor bypass rights.

## Merge Methods

Prefer squash merging for focused contributor pull requests so issue-sized work lands as a coherent commit on `main`.

Do not enable merge methods solely to work around failing required checks or unresolved review requirements.

## Maintainer Configuration Checklist

Before considering the ruleset complete, verify:

- [ ] ruleset targets `main`;
- [ ] pull request is required before merge;
- [ ] at least one approval is required;
- [ ] code-owner approval is required;
- [ ] stale approvals are dismissed on new commits;
- [ ] review conversations must be resolved;
- [ ] `Quality` is required;
- [ ] `CodeQL` is required;
- [ ] `Dependency Review` is required only after Dependency Graph is enabled and the check is proven healthy;
- [ ] force pushes to `main` are blocked;
- [ ] deletion of `main` is blocked;
- [ ] bypass access is limited to authorized maintainers and remains auditable;
- [ ] no nonexistent, scheduled-only, or currently failing check is configured as required.

## Change Management

Whenever workflow names, job names, CODEOWNERS boundaries, or security policy change, review this document and the actual GitHub ruleset together.

A renamed required job can block all merges if the ruleset still points to the old status-check name. Ruleset changes therefore require the same care as CI/security workflow changes.
