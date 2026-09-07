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

## Vulnerabilities

Do not open a public issue for a suspected vulnerability. Follow `SECURITY.md` and GitHub Private Vulnerability Reporting.

## Review Escalation

Flag PRs involving child processes, file deletion/overwrite, package installation, release publishing, credentials, deployment, workflow permissions, dynamic loading, or future remote templates/plugins as security-sensitive.
