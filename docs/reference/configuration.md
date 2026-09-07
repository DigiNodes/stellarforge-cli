# Configuration Reference

StellarForge CLI configuration should be explicit, validated, minimal, and command-scoped.

## Principles

- Validate configuration before side effects.
- Prefer typed schemas over ad-hoc object access.
- Never print secrets or full sensitive config values in normal output.
- Separate user/project configuration from environment-provided credentials.
- Do not silently fall back to Mainnet.
- Network-sensitive commands should require an explicit, validated network target.

## MVP Direction

The final configuration file format and precedence rules are not yet accepted. They should be recorded in an ADR before becoming a stable public contract.

Expected configuration areas may include:

- selected network;
- Stellar RPC endpoint/reference;
- generated-project/template metadata;
- command-specific local development options;
- deployment options that do not contain raw secrets.

Credentials should be referenced securely rather than committed to project configuration.

## Precedence

Until formally decided, do not invent implicit precedence between CLI flags, project configuration, and environment variables. Command implementation issues must document required input sources explicitly.
