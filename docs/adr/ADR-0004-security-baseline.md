# ADR-0004: CLI Security Baseline

- **Status:** Proposed
- **Date:** 2026-09-06
- **Decision owners:** StellarForge Core Team

## Context

A developer CLI has a privileged position on developer machines and in CI. StellarForge CLI is expected to create and modify files, execute child processes, read configuration/environment values, interact with Stellar tooling and network services, generate projects, install dependencies in some workflows, and eventually orchestrate deployment.

A vulnerability in these areas could affect source code, credentials, developer environments, CI systems, or published artifacts. Security therefore must constrain architecture from the beginning rather than being added after feature completion.

## Decision

Adopt a secure-by-default baseline for all CLI architecture and contribution work.

### Trust Principle

Treat command input, filesystem paths, configuration, environment variables, template input, process output, network responses, dependencies, pull-request code, and workflow artifacts as untrusted until validated for their intended use.

### Process Execution

- Do not construct shell commands by concatenating untrusted input.
- Prefer process APIs that pass executable arguments separately and avoid shell mode unless explicitly required and reviewed.
- Validate executable/config inputs.
- Handle timeouts, signals, exit codes, and cleanup deliberately.
- Do not leak sensitive command arguments or environment data in logs.

### Filesystem

- Normalize and validate destination paths.
- Prevent traversal outside approved roots.
- Define explicit overwrite behavior.
- Account for symlinks and partial-failure behavior in destructive/generator workflows.
- Avoid insecure temporary-file patterns.

### Secrets and Configuration

- Never print private keys, seed phrases, access tokens, credentials, or complete sensitive environment values.
- Validate configuration using explicit schemas.
- Minimize collection and retention of sensitive data.
- Error messages should be useful without exposing secrets.

### Dependencies and Supply Chain

- Keep dependencies minimal and justified.
- Commit the npm lockfile once the package foundation exists.
- Use `npm ci` in CI.
- Review dependency changes.
- Enable automated dependency/security tooling appropriate to the public repository.
- Review third-party GitHub Actions and avoid mutable/untrusted workflow dependencies where practical.

### GitHub Actions

- Declare least-privilege permissions.
- Do not execute untrusted pull-request code in privileged contexts.
- Treat changes to workflow permissions, publishing, artifacts, and credentials as security-sensitive.
- Separate ordinary CI from privileged release operations.

### Releases

- Prefer short-lived/OIDC publication credentials where supported.
- Require successful CI/security gates before publication.
- Do not rewrite published package versions as a rollback mechanism.
- Use provenance/attestation features where practical and supported.

## Required Security Tooling

As the repository foundation becomes executable, target:

- CodeQL for JavaScript/TypeScript;
- GitHub Dependency Review;
- Dependabot;
- CODEOWNERS for sensitive areas;
- repository rulesets/required PR checks;
- private vulnerability reporting;
- OpenSSF Scorecard where appropriate.

Security tooling complements code review and threat modeling; it does not replace them.

## Security Review Triggers

Explicit security review is required for changes involving:

- filesystem writes/deletes;
- child processes or shell execution;
- templates or archives;
- dependency installation;
- credentials/secrets;
- network/RPC interactions;
- deployment;
- GitHub Actions permissions;
- release/publishing;
- future remote templates/plugins or dynamic code loading.

## Threat Modeling

The repository will maintain a public threat model covering architecture-level assets, trust boundaries, abuse cases, mitigations, and residual risks. Active undisclosed vulnerabilities must not be documented publicly before coordinated remediation/disclosure.

## Consequences

### Positive

- security requirements become reviewable acceptance criteria;
- risky architectural patterns are discouraged before they become entrenched;
- contributor expectations are explicit;
- release and supply-chain controls evolve with the codebase.

### Trade-offs

- some features require additional design/review time;
- dependencies and workflow changes receive greater scrutiny;
- tests must cover failure and abuse cases, not only happy paths.

## Follow-up Work

- publish `docs/architecture/threat-model.md`;
- publish `docs/architecture/trust-boundaries.md`;
- publish contributor security/dependency guidance;
- configure security workflows when the package/code foundation exists;
- configure GitHub repository security settings/rulesets outside source control.
