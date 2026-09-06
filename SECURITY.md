# Security Policy

Security is a core engineering requirement for StellarForge CLI.

## Reporting a Vulnerability

Please **do not open a public issue** for a suspected vulnerability.

Use GitHub's **Private Vulnerability Reporting / Security Advisory** flow for this repository when available. Include enough information for maintainers to understand and reproduce the problem safely:

- affected command, component, or version;
- vulnerability description;
- reproduction steps or proof of concept;
- potential impact;
- relevant environment details;
- suggested mitigation, if known.

Do not include real credentials, private keys, seed phrases, access tokens, or third-party private data in a report.

If GitHub Private Vulnerability Reporting is not available for the repository, contact a StellarForge/DigiNodes maintainer through an established private organization channel rather than disclosing the issue publicly.

## What to Expect

Maintainers will make reasonable efforts to:

1. acknowledge the report;
2. validate and assess the issue;
3. coordinate remediation with the reporter when useful;
4. prepare and test a fix;
5. publish an advisory or release information when appropriate.

Response and remediation time depend on severity, complexity, maintainer availability, and coordinated-disclosure requirements. This policy intentionally does not promise a fixed SLA.

## Scope

This policy covers security issues in `DigiNodes/stellarforge-cli` and its release/build automation.

Security issues in another StellarForge repository should be reported through that repository's security process.

## Security-Sensitive Areas

Examples include:

- filesystem writes/deletes and path handling;
- subprocess execution;
- template generation/extraction;
- dependency installation;
- configuration/environment handling;
- Stellar network/RPC interaction;
- deployment workflows;
- credentials and secret handling;
- GitHub Actions permissions;
- package publication and release provenance.

## Public Security Discussions

General security hardening, threat modeling, dependency policy, and non-sensitive improvements may be discussed publicly. Do not publish exploit details for an unresolved vulnerability until maintainers and the reporter have coordinated an appropriate disclosure.
