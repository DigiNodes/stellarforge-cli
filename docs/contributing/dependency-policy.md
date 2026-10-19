# Dependency Policy

Dependencies increase capability and supply-chain risk. Add one only when its value is clear and the functionality should not reasonably be implemented with existing platform capabilities.

## Requirements

Before adding a dependency, consider:

- maintenance activity and ownership;
- security history and known vulnerabilities;
- transitive dependency footprint;
- package install/lifecycle scripts;
- license compatibility;
- bundle/runtime cost;
- whether the dependency is needed at runtime or only for development;
- whether Node.js built-ins or existing dependencies are sufficient.

## Rules

- Keep runtime dependencies minimal.
- Commit `package-lock.json` and use `npm ci` in CI.
- Do not introduce preinstall/postinstall scripts without explicit justification and review.
- Avoid abandoned or typosquatting-risk packages.
- Dependency changes must pass automated dependency review and the normal CI quality gate.
- Security-sensitive or high-impact dependencies require maintainer review.
- GitHub Actions must remain pinned to reviewed full commit SHAs rather than mutable tags.
- Automated dependency pull requests must not be auto-merged by default.

## Pull Request Dependency Review

`.github/workflows/dependency-review.yml` reviews dependency changes on pull requests using GitHub's Dependency Review Action.

The workflow contract is:

| Setting | Required behavior |
| --- | --- |
| Trigger | `pull_request`, using the default opened, synchronize, and reopened events; no branch or path filters |
| Permissions | Top-level `contents: read`; no job-level override, write permission, or secrets required |
| Job | `dependency-review`, displayed as `Dependency Review`, on `ubuntu-latest` with a 10-minute timeout |
| Action | `actions/dependency-review-action`, pinned to a reviewed full 40-character commit SHA |
| Failure threshold | `fail-on-severity: high`, covering newly introduced high and critical vulnerabilities |
| Execution | No conditional skips, `continue-on-error`, checkout, install, or arbitrary command steps |

This is an unprivileged PR check, not `pull_request_target`. It compares dependency changes between the PR's base and head; it is not a full audit of every dependency already present in the base branch. There are no severity exceptions or package allowlists configured in this workflow.

The baseline policy fails a pull request when it introduces a dependency with a known vulnerability rated `high` or `critical`. Lower-severity findings remain review signals and may still block a change when the affected dependency is security-sensitive, unnecessary, directly exploitable in the CLI threat model, or otherwise conflicts with maintainer judgment.

Dependency Review is a complement to normal code review. A green dependency-review result does not make a new package automatically acceptable.

Contributors must resolve high/critical findings by removing or replacing the dependency or selecting a reviewed fixed version. Maintainers review the dependency's purpose, ownership, license, transitive footprint, and install scripts as well as the automated result. Lowering the threshold, adding exceptions, skipping a failing job, or granting write permissions is not a routine way to unblock a PR. Any proposed policy/workflow change requires explicit supply-chain/security maintainer review and corresponding documentation and conformance-test updates.

If the check cannot run because of a service, repository configuration, or fork-approval problem, maintainers must resolve that blocker and rerun the check; an absent or skipped result is not a pass. Mandatory merge enforcement is configured separately through the [repository ruleset](repository-ruleset.md), not by this document or the workflow alone. Dependency Review introduces no auto-merge behavior: dependency PRs still require the normal checks and maintainer review.

`tests/dependency-review-policy.test.ts` checks this deliberately small workflow's complete executable shape and the documented settings. It includes negative cases for filters, privileged triggers/permissions, weakened severity, conditional skips, error suppression, extra inputs, and added steps. Run it with `npm test -- tests/dependency-review-policy.test.ts` after the standard clean install. The check is static and does not call GitHub or execute an action.

## Dependabot Updates

`.github/dependabot.yml` monitors both:

- npm dependencies from the repository root; and
- GitHub Actions referenced by workflows.

Both ecosystems are checked **weekly on Mondays in the `Africa/Lagos` timezone** — npm at **08:00** and GitHub Actions at **08:30** — with an **open pull-request limit of 5 each**.

Compatible minor and patch updates are grouped to reduce pull-request noise:

- `npm-minor-and-patch` for npm `minor` and `patch` updates;
- `github-actions-minor-and-patch` for GitHub Actions `minor` and `patch` updates.

Major updates are intentionally excluded from these groups and remain **separate** so compatibility, migration requirements, security impact, and release impact can be reviewed explicitly.

Dependabot pull requests must pass the same CI/security checks as contributor pull requests and remain subject to maintainer review. **No auto-merge policy is enabled** by this configuration.

### Node.js type definitions and the supported runtime

The package engine range is `Node.js >=22.13.0 <25`. The `@types/node` development dependency is intentionally pinned to the **current supported Node 22 type line** rather than the newest available major.

Type definitions describe which Node.js APIs are available. Compiling against the types for the **oldest supported Node major** means the compiler rejects APIs that do not exist in that runtime. If development instead compiled against a newer major's types, code could pass typechecking and CI while still crashing for users on the engine floor (Node 22.13.0). Pinning to the floor is therefore the conservative choice that protects compatibility across the whole supported range.

To keep that guarantee stable, Dependabot ignores **major** updates for `@types/node` (`update-types: version-update:semver-major`). Compatible minor and patch updates within the Node 22 type line remain eligible. This prevents Dependabot from reintroducing a Node type major outside the supported runtime range while the engine range is unchanged.

If the engine floor or range is ever changed, revisit both the `@types/node` pin and this Dependabot ignore rule together so the type line continues to track the oldest supported major.

## Updates

Prefer small, reviewable dependency updates. Major upgrades should document compatibility impact and include relevant tests. When an urgent security update conflicts with normal grouping or cadence, prioritize the security fix in a focused pull request rather than waiting for the next scheduled version-update run.
