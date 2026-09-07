# Coding Standards

## General

- Keep modules focused and cohesive.
- Prefer explicit types and strict TypeScript.
- Avoid hidden global state.
- Separate parsing/presentation from side-effecting services.
- Keep dependencies minimal and justified.
- Write code that behaves consistently in local and CI/non-TTY environments.

## Error Handling

- Do not swallow failures.
- Convert internal errors into safe user-facing messages at command boundaries.
- Preserve useful causes for maintainers/tests without leaking secrets.
- Use deterministic exit behavior.

## Filesystem

- Validate and normalize paths before mutation.
- Prevent path traversal and unintended writes outside approved roots.
- Define overwrite behavior explicitly.
- Treat symlinks and partial generation failures carefully.

## Processes

- Prefer argument arrays with shell mode disabled.
- Never interpolate untrusted values into shell strings.
- Propagate meaningful subprocess failures.
- Handle cancellation/signals and cleanup for long-running commands.

## Security

Never log private keys, seed phrases, credentials, tokens, full environment objects, or sensitive config. Security-sensitive changes require stronger tests and review.

## Tests

Behavior changes require appropriate tests. Prefer focused unit tests for services and integration tests for executable/command behavior. Keep live-network dependencies outside normal unit-test paths unless explicitly required.
