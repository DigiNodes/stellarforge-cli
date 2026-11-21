# {{projectName}}

Generated with the StellarForge `smart-contract` template.

This is an intentionally small, non-custodial Soroban starter. It does not manage assets, balances, authorization, or deployment credentials.

## Requirements

- Rust 1.84 or newer
- `wasm32v1-none` target
- current `stellar` CLI

Install the Rust target when needed:

```bash
rustup target add wasm32v1-none
```

## Test

```bash
cargo test
```

## Build

Use the current Stellar CLI contract workflow:

```bash
stellar contract build
```

The CLI builds contract crates for the `wasm32v1-none` target using the release profile.

## Testnet deployment

Build first, then deploy the generated Wasm with an identity you created outside this repository. Choose an alias that is valid for your local Stellar configuration; `my-contract` is used below only as an example.

```bash
stellar contract deploy \
  --wasm <path-to-generated-wasm> \
  --source <local-identity> \
  --network testnet \
  --alias my-contract
```

Invoke the starter after deployment:

```bash
stellar contract invoke \
  --id my-contract \
  --source <local-identity> \
  --network testnet \
  -- hello --name StellarForge
```

Do not commit private keys, secret seeds, signing credentials, or production deployment material. Use locally managed Stellar identities or your approved secret-management workflow.

This starter targets Stellar Testnet only; it does not configure or claim Mainnet or hosted deployment support.

## Offline smoke coverage

The `rustup`, `cargo`, and `stellar` commands in this README require locally installed external tooling and are exercised with safe command mocks; no contract is built or deployed by the offline smoke test. Testnet deployment and invocation require a configured Stellar identity and live Testnet access, so those commands are not executed against a network by the smoke test. No credentials are used or stored.
