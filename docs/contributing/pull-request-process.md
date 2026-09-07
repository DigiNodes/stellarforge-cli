# Pull Request Process

## Before Opening

- Work from an assigned/approved issue where required.
- Keep the change within issue scope.
- Rebase/update from the current default branch when necessary.
- Run all available local checks.
- Add tests and documentation as required.
- Add a Changeset for release-impacting changes.

## Pull Request Content

The PR should explain:

- what changed;
- why it changed;
- linked issue;
- testing performed;
- security impact;
- release/Changeset impact;
- documentation impact;
- known limitations or follow-up work.

## Review

Maintainers review for correctness, architecture, scope, tests, security, dependency impact, documentation, and release compatibility. Passing CI is necessary but not sufficient for merge.

Security-sensitive areas include process execution, filesystem mutation, dependency installation, deployment, credentials, GitHub Actions permissions, and release/publishing behavior.

## Merge

Merge only after required checks/reviews pass and unresolved review threads are addressed. Do not bypass protections for convenience.
