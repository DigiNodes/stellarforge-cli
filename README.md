# StellarForge CLI

> The official command-line interface for building production-ready Stellar and Soroban applications.

![StellarForge CLI Banner](./assets/banner.png)

> **Status:** 🚧 Active Development (MVP)
> **License:** MIT
> **Language:** TypeScript
> **Runtime:** Node.js

---

## Overview

StellarForge CLI is the primary entry point into the **StellarForge** ecosystem.

Its mission is to provide developers with a fast, consistent, and production-ready development experience for building applications on the Stellar network.

Instead of spending hours configuring project structures, dependencies, Soroban tooling, Docker environments, deployment scripts, and development workflows, developers should be able to bootstrap a complete project with a single command.

StellarForge CLI brings the developer experience that tools like **create-next-app**, **npm create vite**, **cargo**, and **Angular CLI** provide to the Stellar ecosystem.

---

## Why StellarForge CLI?

Building on Stellar often involves repetitive setup before any application logic can be written.

Developers typically need to:

* Configure project structures
* Install and configure Stellar SDKs
* Set up Soroban development tools
* Configure local development environments
* Create deployment scripts
* Manage environment variables
* Connect to Stellar RPC services
* Configure testing frameworks
* Establish CI/CD workflows

Every team ends up recreating this infrastructure.

StellarForge CLI eliminates that repetition by providing opinionated tooling, standardised project templates, and reusable workflows so developers can focus on building products instead of infrastructure.

---

## Vision

Our vision is to make building on Stellar as simple as:

```bash
stellarforge new my-app
```

and have a production-ready foundation generated in seconds.

Over time, StellarForge CLI aims to become the standard developer experience for the Stellar ecosystem.

---

## Core Features

### 🚀 Project Scaffolding

Generate complete application structures with sensible defaults.

```bash
stellarforge new my-app
```

---

### 📦 Starter Templates

Bootstrap projects from reusable templates.

Planned templates include:

* Basic Application
* Full-Stack Application
* Soroban Smart Contract
* Backend API
* Payment Service
* Identity Service
* Enterprise Starter

---

### ⚙️ Local Development

Start the development environment using a single command.

```bash
stellarforge dev
```

The CLI will orchestrate the local development workflow, making it easier to build and test applications.

---

### 🧪 Unified Testing

Run project tests from one place.

```bash
stellarforge test
```

---

### 🚀 Deployment

Deploy applications and contracts to Stellar networks.

```bash
stellarforge deploy
```

Initial support targets Soroban Testnet, with additional deployment workflows planned for future releases.

---

### 🩺 Environment Diagnostics

Validate your development environment before you begin.

```bash
stellarforge doctor
```

The diagnostics command will verify required tools and configuration, helping developers resolve setup issues quickly.

---

## Example Workflow

```text
Developer
    │
    ▼
StellarForge CLI
    │
    ▼
Generates a Complete Stellar Application
    │
    ├── Frontend
    ├── Backend
    ├── Smart Contracts
    ├── Docker Configuration
    ├── GitHub Workflows
    ├── Tests
    └── Documentation
    │
    ▼
Production-Ready Foundation
```

---

## Planned Commands

| Command               | Description                                      |
| --------------------- | ------------------------------------------------ |
| `stellarforge new`    | Create a new Stellar application                 |
| `stellarforge add`    | Add features and modules to an existing project  |
| `stellarforge dev`    | Start the local development environment          |
| `stellarforge test`   | Run the project's test suite                     |
| `stellarforge deploy` | Deploy contracts and application components      |
| `stellarforge doctor` | Validate the development environment             |
| `stellarforge help`   | Display available commands and usage information |

---

## Repository Structure

```text
stellarforge-cli/

.github/
docs/
src/
tests/

README.md
ROADMAP.md
CHANGELOG.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
LICENSE

package.json
tsconfig.json
```

---

## Documentation

Additional documentation is available throughout the repository:

* **Product Requirements Document (PRD)** – Defines the product vision, goals, and scope.
* **Architecture Decision Records (ADRs)** – Documents significant architectural decisions.
* **Architecture Guides** – Explains the internal design of the CLI.
* **Developer Guides** – Installation, quick start, and development workflows.
* **Reference Documentation** – Commands, configuration, and API references.
* **Contribution Guides** – Coding standards, branching strategy, and contributor workflows.

---

## Roadmap

The MVP focuses on building the foundation of the CLI.

### Phase 1

* CLI foundation
* Project scaffolding
* Starter templates
* Local development commands
* Testing framework

### Phase 2

* Deployment workflows
* Feature installation system
* Configuration management
* Improved developer experience

### Phase 3

* Plugin architecture
* Remote template registry
* Release automation
* Advanced project management

See the full roadmap in [ROADMAP.md](ROADMAP.md).

---

## Contributing

We welcome developers, designers, technical writers, testers, and researchers from across the Stellar ecosystem.

Whether you're fixing bugs, improving documentation, implementing features, or sharing ideas, your contributions help strengthen the developer experience for everyone.

Please read:

* [CONTRIBUTING.md](CONTRIBUTING.md)
* [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
* [SECURITY.md](SECURITY.md)

---

## Security

Security is a core priority for StellarForge.

If you discover a potential vulnerability, please use GitHub's **Private Vulnerability Reporting** feature instead of opening a public issue.

---

## License

This project is released under the MIT License.

---

## Part of the StellarForge Ecosystem

StellarForge CLI is one component of the broader StellarForge ecosystem.

| Repository                 | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| **StellarForge**           | Ecosystem documentation, governance, and architecture |
| **stellarforge-cli**       | Developer command-line interface                      |
| **stellarforge-sdk**       | Shared TypeScript SDK and developer utilities         |
| **stellarforge-workflows** | Workflow and event orchestration engine               |
| **stellarforge-examples**  | Starter templates and reference applications          |

Together, these repositories provide a modular, open-source foundation for building scalable, production-ready applications on Stellar and Soroban.

---

## Project Status

StellarForge CLI is currently under active development. The architecture, documentation, and contributor workflows are being established as the foundation for future community contributions.

Feedback, ideas, and contributions are welcome as we build the next generation of developer tooling for the Stellar ecosystem.
