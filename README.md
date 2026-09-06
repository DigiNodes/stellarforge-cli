# StellarForge CLI

> The command-line interface for the StellarForge ecosystem, designed to help developers create, validate, test, and deploy structured Stellar applications.

> **Status:** 🚧 Foundation / MVP Development  
> **License:** MIT  
> **Planned implementation:** TypeScript on Node.js

---

## Overview

StellarForge CLI is planned as the primary command-line entry point into the **StellarForge** developer-tooling ecosystem.

The project addresses repetitive setup around Stellar application development: project structure, supported tooling, configuration, local workflows, testing, and deployment orchestration. Rather than claiming to replace the underlying Stellar tools, StellarForge CLI will provide a consistent layer that coordinates them through documented conventions and reusable project templates.

The repository is currently in its foundation phase. Architecture, security, release engineering, contributor workflows, and the first implementation milestones are being established before the CLI is presented as production-ready software.

---

## MVP Goal

The v1.0 MVP aims to make the core workflow approachable through commands such as:

```bash
stellarforge new my-app
stellarforge doctor
stellarforge dev
stellarforge test
stellarforge deploy
```

These commands are planned and will become available incrementally through the roadmap. Do not assume a command documented here is implemented until the corresponding release notes state that it is available.

---

## Current MVP Scope

### Project Scaffolding

Planned command:

```bash
stellarforge new my-app
```

The generator will create supported project foundations with validated paths, controlled templates, explicit overwrite behavior, and testable output.

### Initial Templates

The MVP targets four initial template categories:

- Basic App
- Full Stack App
- Stellar smart contract
- API Service

Additional domain templates may be considered after the MVP based on validated developer needs.

### Environment Diagnostics

Planned command:

```bash
stellarforge doctor
```

Diagnostics will check the developer tooling required by supported workflows and provide actionable remediation without exposing sensitive environment values.

### Local Development

Planned command:

```bash
stellarforge dev
```

This command will orchestrate supported local-development processes; it will not reimplement the underlying Stellar development tools.

### Unified Testing

Planned command:

```bash
stellarforge test
```

The CLI will provide a consistent entry point for supported project tests while preserving meaningful failures and exit codes.

### Stellar Testnet Deployment

Planned command:

```bash
stellarforge deploy
```

The MVP deployment scope is **Stellar Testnet**. Mainnet deployment requires additional architecture and security review and is not part of the initial MVP.

---

## What This Repository Owns

`stellarforge-cli` owns:

- command parsing and CLI UX;
- project scaffolding orchestration;
- controlled template integration;
- environment diagnostics;
- local development/test orchestration;
- deployment orchestration;
- CLI-specific configuration, errors, logs, tests, and documentation.

It does **not** own the implementation of future shared SDKs, workflow engines, indexers, contract-security engines, or unrelated application business logic. Those capabilities belong in their appropriate StellarForge modules when/if created.

---

## Security Model

A developer CLI runs in trusted developer and CI environments, so security constrains the architecture from the start.

The project treats command input, filesystem paths, configuration, environment variables, process output, network responses, dependencies, and pull-request code as untrusted until validated for their intended use.

Key principles include:

- safe child-process execution without unsafe shell interpolation;
- path validation and traversal protection;
- secret-safe logs and errors;
- minimal/reviewed dependencies;
- least-privilege GitHub Actions;
- dependency and static-analysis checks;
- protected release automation.

See [SECURITY.md](SECURITY.md), the [threat model](docs/architecture/threat-model.md), and [ADR-0004](docs/adr/ADR-0004-security-baseline.md).

---

## Planned Commands

| Command | MVP purpose | Status |
| --- | --- | --- |
| `stellarforge new` | Create a supported Stellar project | Planned |
| `stellarforge doctor` | Validate the development environment | Planned |
| `stellarforge dev` | Orchestrate supported local development | Planned |
| `stellarforge test` | Run supported project tests | Planned |
| `stellarforge deploy` | Deploy through the MVP Testnet workflow | Planned |
| `stellarforge --help` | Display CLI usage/help | Planned |
| `stellarforge --version` | Display CLI version | Planned |

`stellarforge add`, plugin architecture, and remote template registries are **post-v1 candidates**, not MVP commitments.

---

## Roadmap

The planned release path is:

1. **v0.1 — CLI Foundation**
2. **v0.2 — Project Generator & Templates**
3. **v0.3 — Configuration & Diagnostics**
4. **v0.4 — Development & Testing Commands**
5. **v0.5 — Stellar Testnet Deployment**
6. **v0.6 — Security, Documentation & DX Hardening**
7. **v0.7–v0.9 — MVP Stabilization**
8. **v1.0 — Stable CLI MVP**

See [ROADMAP.md](ROADMAP.md) for scope and post-v1 candidates.

---

## Repository Foundation

As implementation begins, the repository is being organized around:

```text
stellarforge-cli/
├── .changeset/
├── .github/
├── docs/
│   ├── adr/
│   ├── architecture/
│   ├── contributing/
│   ├── guides/
│   ├── prd/
│   └── reference/
├── src/
├── tests/
├── README.md
├── ROADMAP.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── LICENSE
```

Some implementation directories/files will appear as their corresponding foundation issues are completed.

---

## Release & Versioning

The proposed release strategy uses Semantic Versioning and Changesets. Release-impacting PRs will record their intended version/changelog effect close to the code change.

See [ADR-0003](docs/adr/ADR-0003-release-and-versioning-strategy.md).

---

## Contributing

We welcome development, documentation, testing, research, security, and developer-experience contributions.

Before starting implementation:

- read [CONTRIBUTING.md](CONTRIBUTING.md);
- select a clearly scoped issue;
- review linked architecture/security requirements;
- confirm assignment when the issue/program requires it;
- keep the PR focused on its acceptance criteria.

The project prioritizes meaningful, independently reviewable contributions over PR volume.

---

## Reporting Security Issues

Do not disclose suspected vulnerabilities in public issues. Follow [SECURITY.md](SECURITY.md) and use GitHub Private Vulnerability Reporting when available.

---

## Part of StellarForge

StellarForge CLI is one component of the broader **StellarForge** open-source developer-tooling initiative.

The root `DigiNodes/StellarForge` repository coordinates ecosystem-level architecture, governance, documentation, and roadmap decisions. Additional module repositories will be linked here only when they actually exist and have an established role.

---

## License

StellarForge CLI is intended to be released under the MIT License. The repository license file is established as part of the public foundation before code distribution.
