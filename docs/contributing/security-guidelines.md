# Security Engineering Guidelines

Security applies to every contribution, with heightened review for filesystem, process, network, dependency, deployment, credential, CI, and release changes.

## Treat as Untrusted

Command arguments, paths, config, environment values, template data, process output, network responses, dependencies, and pull-request code must be validated before trusted use.

## Required Practices

- never concatenate untrusted input into shell commands;
- validate and constrain filesystem destinations;
- do not follow unsafe overwrite assumptions;
- never expose secrets in logs/errors/tests/examples;
- validate configuration schemas;
- use least-privilege workflow permissions;
- avoid privileged execution of untrusted PR code;
- keep dependencies justified and reviewable;
- test expected failure paths and security-sensitive boundaries;
- fail closed for network/deployment target ambiguity.

## Automated Code Scanning

`.github/workflows/codeql.yml` runs CodeQL analysis for the JavaScript/TypeScript codebase on pull requests, pushes to `main`, and a weekly schedule.

CodeQL findings are owned by the StellarForge CLI maintainers as security work, not by the automation itself. A maintainer should triage each new finding for validity, reachability, severity, and affected trust boundary before dismissal or remediation.

Do not dismiss a CodeQL alert merely because CI passes or exploitation has not been demonstrated. False-positive or accepted-risk dismissals should include enough rationale to support later audit/review. Findings involving command execution, filesystem writes, secrets, deployment, dependency handling, or other documented trust boundaries require heightened review.

CodeQL complements tests and human review; it does not replace either.

## Vulnerabilities

Do not open a public issue for a suspected vulnerability. Follow `SECURITY.md` and GitHub Private Vulnerability Reporting.

## Review Escalation

Flag PRs involving child processes, file deletion/overwrite, package installation, release publishing, credentials, deployment, workflow permissions, dynamic loading, or future remote templates/plugins as security-sensitive.
