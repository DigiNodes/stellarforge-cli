# Branch Strategy

`main` is the protected integration branch and should remain releasable or close to releasable.

## Working Branches

Use short-lived branches created from the current `main`. Suggested prefixes:

- `feat/` — new behavior
- `fix/` — bug fixes
- `docs/` — documentation
- `test/` — test-only work
- `refactor/` — behavior-preserving restructuring
- `chore/` — maintenance/infrastructure
- `security/` — non-confidential security hardening

Do not place confidential vulnerability details in branch names.

## Rules

- no routine direct pushes to `main`;
- one coherent issue/scope per branch where practical;
- update from `main` when required to resolve integration conflicts;
- delete obsolete merged branches;
- do not keep long-running branches as substitutes for milestones or releases.
