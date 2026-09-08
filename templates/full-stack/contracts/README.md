# Contracts workspace

This directory is the contract boundary for `{{projectName}}`.

The Full Stack starter deliberately does not invent a production Soroban contract or embed signing credentials. Add reviewed Soroban contracts here when the application domain is defined, or start from StellarForge's dedicated `smart-contract` template.

Recommended structure when contract development begins:

```text
contracts/
  Cargo.toml
  src/
  test/
```

Keep network configuration and signing secrets outside source control. Contract build and deployment workflows should target Stellar Testnet until explicitly promoted through the project's release process.
