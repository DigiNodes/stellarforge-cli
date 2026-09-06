# ADR-0001 — StellarForge CLI Architecture

**Status:** Accepted  
**Date:** 2026-06-21  
**Authors:** StellarForge Core Team

## Context

StellarForge CLI is the primary command-line entry point for the StellarForge ecosystem. It must coordinate project creation, diagnostics, local development, testing, deployment, and future integrations without becoming a monolithic implementation of every StellarForge subsystem.

The CLI therefore needs an architecture that is easy to understand, test, extend, secure, and maintain across multiple contributors and repositories.

## Decision

Adopt a **modular, command-based architecture** in which the CLI remains a thin orchestration layer.

The CLI is responsible for:

- parsing commands and options;
- validating user input and configuration;
- coordinating command execution;
- rendering terminal output;
- handling CLI-level errors and exit codes;
- delegating specialized behavior to internal modules or external StellarForge packages where appropriate.

The CLI should not absorb reusable SDK, workflow-engine, indexing, or security-analysis responsibilities that belong in separate StellarForge modules.

## Architectural Principles

### 1. Single Responsibility

Each command or supporting module should have a focused responsibility. Parsing, validation, filesystem operations, process execution, template rendering, diagnostics, and output should be separable where practical.

### 2. Extensibility

The architecture should make it possible to add commands and supported capabilities without rewriting the CLI core.

Extensibility does **not** imply a public plugin system in v1.0. Plugin architecture remains a post-v1 consideration.

### 3. Convention over Configuration

The CLI should provide sensible defaults and predictable project conventions while keeping required configuration explicit and validated.

### 4. Developer Experience First

Commands should provide clear help, consistent output, actionable errors, meaningful exit codes, and minimal unnecessary setup.

### 5. Framework Agnostic Where Practical

Core CLI infrastructure should avoid unnecessary coupling to one frontend or backend framework. Template-specific behavior belongs in controlled template modules.

### 6. Composable Modules

Reusable concerns should be implemented as internal modules or shared StellarForge packages rather than duplicated across commands.

## Conceptual Architecture

```text
User
  │
  ▼
StellarForge CLI
  │
  ├── Command Parsing
  ├── Validation
  ├── Configuration
  ├── Terminal Output
  └── Error / Exit Handling
  │
  ▼
Command Modules
  │
  ├── Project Generation
  ├── Diagnostics
  ├── Development Orchestration
  ├── Testing Orchestration
  └── Deployment Orchestration
  │
  ▼
Shared Internal Services / StellarForge Packages
  │
  ├── Templates
  ├── Filesystem / Process Utilities
  ├── SDK Integrations
  └── Workflow Integrations
  │
  ▼
Stellar Tooling / Stellar Network
```

This is a conceptual responsibility model, not a requirement that every command traverse every layer.

## Repository Responsibilities

`stellarforge-cli` owns:

- CLI executable and command tree;
- command/option validation;
- project scaffolding orchestration;
- controlled template management for CLI-generated projects;
- environment diagnostics;
- local development orchestration;
- test orchestration;
- deployment orchestration;
- terminal output;
- CLI-level error and exit behavior.

It does not own:

- general-purpose Stellar SDK implementation;
- workflow/event-engine internals;
- blockchain indexing;
- smart-contract auditing/security engine implementation;
- ecosystem-wide governance.

## Security Implications

The thin-orchestration model does not reduce the CLI's security responsibility. The CLI performs high-risk operations such as filesystem mutation and child-process execution.

Implementations must therefore:

- validate command arguments and configuration;
- normalize and constrain filesystem paths;
- avoid unsafe shell interpolation;
- isolate process execution behind testable boundaries where practical;
- avoid secret leakage in logs/errors;
- treat external process and network responses as untrusted;
- follow the repository threat model and security baseline.

## Consequences

### Positive

- clearer contributor boundaries;
- easier testing of commands and services independently;
- reduced coupling between CLI UX and Stellar integration logic;
- easier future command additions;
- better separation across StellarForge repositories;
- improved security reviewability.

### Trade-offs

- more internal interfaces/modules than a single-script CLI;
- cross-repository coordination may be required as StellarForge grows;
- package/API compatibility must be managed carefully;
- maintainers must resist duplicating logic inside commands for short-term convenience.

## Alternatives Considered

### Monolithic CLI

A single command implementation layer containing parsing, filesystem operations, network behavior, and process execution was rejected because it would become difficult to test, review, secure, and extend.

### Plugin-first Architecture

A plugin architecture was rejected for the v1.0 foundation because it expands the trust model, lifecycle management, compatibility surface, and security requirements before core CLI behavior is stable.

## Follow-up Decisions

Future ADRs may cover:

- command framework and command lifecycle;
- configuration format/schema;
- template registry architecture;
- package/version compatibility;
- release/versioning strategy;
- security baseline;
- telemetry, if ever proposed;
- post-v1 plugin architecture.

No follow-up decision is implied to be accepted merely because it is listed here.
