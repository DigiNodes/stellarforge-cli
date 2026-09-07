# Commit Conventions

Commits should make review and history easier to understand.

## Format

Prefer concise imperative subjects, optionally using conventional prefixes:

- `feat:`
- `fix:`
- `docs:`
- `test:`
- `refactor:`
- `chore:`
- `ci:`
- `security:`

Examples:

```text
feat: add project-name validation
fix: preserve subprocess exit code
security: reject template path traversal
```

## Rules

- Keep unrelated changes out of the same commit.
- Do not include secrets or credentials in commit content/messages.
- Explain non-obvious architectural/security trade-offs in the PR or ADR, not only the commit message.
- Do not rewrite shared history unnecessarily.
- Release semantics are communicated through Changesets; commit prefixes alone do not determine versions.
