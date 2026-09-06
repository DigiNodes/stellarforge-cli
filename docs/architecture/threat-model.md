# StellarForge CLI Threat Model

**Status:** Initial architecture-level model. Update this document as commands and integrations are implemented.

## Purpose

StellarForge CLI executes on developer machines and CI systems. It may create/modify project files, invoke external tools, read configuration/environment data, communicate with Stellar services, install dependencies, and orchestrate deployment. This document identifies the main assets, trust boundaries, threat classes, and baseline mitigations for that role.

This is not a place to disclose active unpatched vulnerabilities.

## Assets

We aim to protect:

- developer source code and files;
- filesystem integrity outside the intended project root;
- environment variables and credentials;
- Stellar account/deployment secrets handled by surrounding tooling;
- generated project integrity;
- CLI configuration integrity;
- CI credentials and permissions;
- package/release integrity;
- developer trust in CLI output and actions.

## Trust Boundaries

The CLI must treat these as untrusted or context-dependent inputs:

1. command-line arguments and interactive input;
2. project/configuration files;
3. environment variables;
4. filesystem paths, existing files, and symlinks;
5. template data and generated-project parameters;
6. output from external processes;
7. Stellar RPC/network responses;
8. package dependencies and lifecycle behavior;
9. pull-request code and workflow artifacts;
10. future remote templates/plugins, if introduced post-v1.

## Threats and Baseline Mitigations

### Command Injection

**Threat:** Untrusted project names, paths, flags, configuration, or external output reaches a shell command.

**Mitigations:**

- avoid shell interpolation;
- invoke executables with separated argument arrays;
- validate expected values;
- avoid shell mode unless explicitly justified and security-reviewed;
- test hostile/metacharacter inputs.

### Path Traversal / Unintended File Mutation

**Threat:** A generator or command writes/deletes outside the intended project root or overwrites unexpected files.

**Mitigations:**

- resolve and normalize paths;
- validate destination containment;
- define overwrite rules;
- account for symlinks;
- use safe failure/rollback strategies for multi-file generation;
- test traversal and collision cases.

### Secret Disclosure

**Threat:** Credentials, tokens, private keys, seed phrases, or sensitive environment values appear in logs, exceptions, telemetry, CI output, or generated files.

**Mitigations:**

- never log known secret values;
- redact sensitive error context;
- minimize secret handling;
- do not add telemetry involving sensitive data without a separate decision;
- test failure paths for accidental disclosure.

### Malicious or Unexpected Configuration

**Threat:** Configuration causes unsafe paths, executables, networks, or behavior.

**Mitigations:**

- schema validation;
- constrained enums/formats where appropriate;
- explicit network/environment validation;
- fail closed for unsafe/ambiguous configuration.

### Dependency / Supply-Chain Compromise

**Threat:** A malicious or vulnerable dependency, package update, install script, or workflow dependency compromises users or releases.

**Mitigations:**

- minimize dependencies;
- lock dependencies;
- use reproducible CI installation;
- automated dependency review/scanning;
- human review of dependency additions;
- least-privilege CI;
- secure package publication and provenance where supported.

### Privileged CI Execution

**Threat:** Untrusted PR code gains repository/package credentials or elevated GitHub token permissions.

**Mitigations:**

- do not execute untrusted code in privileged PR workflow contexts;
- explicit least-privilege permissions;
- separate release workflows from PR CI;
- protect publishing environments/credentials;
- review workflow changes as security-sensitive.

### Unsafe Deployment Target

**Threat:** Deployment command targets the wrong network/account or exposes secrets.

**Mitigations:**

- MVP supports guarded Stellar Testnet deployment only;
- validate network/configuration;
- require explicit inputs for consequential actions;
- avoid secret-bearing logs;
- test failure and cancellation behavior.

### Denial of Service / Resource Exhaustion

**Threat:** External processes, malformed input, network responses, or generator behavior cause hangs, runaway processes, or excessive resource use.

**Mitigations:**

- deliberate timeouts/cancellation where appropriate;
- process cleanup and signal handling;
- bounded parsing/processing where applicable;
- clear exit behavior.

## Out-of-Scope / Future Threat Surfaces

Remote templates, plugin execution, dynamic code loading, Mainnet deployment, and a plugin marketplace are not part of the MVP. If introduced later, they require a threat-model update and architecture decision before implementation.

## Review Triggers

Update this threat model when:

- a new command crosses a trust boundary;
- the CLI begins handling a new secret/credential type;
- remote content becomes executable or writable;
- package installation behavior changes;
- deployment scope expands;
- release architecture changes;
- a security incident reveals a missing threat class.

## Residual Risk

No CLI can eliminate risks inherited from the operating system, user-installed developer tools, npm ecosystem, GitHub, Stellar network services, or third-party dependencies. StellarForge should minimize privileges and trust, validate its own inputs/boundaries, and make consequential behavior explicit and reviewable.
