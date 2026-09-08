# Command Reference

This reference tracks the v1.0 MVP command surface.

| Command | Purpose | MVP Status |
|---|---|---|
| `stellarforge --help` | Show global usage/help | Implemented |
| `stellarforge --version` | Show installed CLI version | Implemented |
| `stellarforge new <name>` | Scaffold a supported Stellar project | Implemented |
| `stellarforge doctor` | Validate the development environment | Implemented |
| `stellarforge dev` | Orchestrate local development | Implemented |
| `stellarforge test` | Run supported tests | Implemented |
| `stellarforge deploy --network testnet --source <identity>` | Deploy a supported smart contract to Stellar Testnet | Implemented |

## Root Command

The root command is `stellarforge`. It provides global help, installed-package version output, deterministic parser errors, and the implemented MVP product commands.

```bash
stellarforge --help
stellarforge --version
```

`stellarforge --version` reads the version from the installed package metadata. It does not contact a package registry, run a subprocess, or maintain a second hard-coded version constant.

Unknown options or positional commands fail with a non-zero exit code and include root usage information. `stellarforge add` is not part of the v1.0 MVP.

## Deploy

MVP deployment is intentionally restricted to generated Stellar smart-contract Cargo workspaces and Stellar Testnet.

```bash
stellarforge deploy --network testnet --source deployer
```

The network value must be written explicitly as `testnet`; Mainnet, Futurenet, local networks, and implicit defaults are not accepted. The source must be the name of a Stellar CLI identity already configured by the developer. StellarForge does not accept raw secret keys, seed phrases, public keys, or path-like source values for deployment.

The command invokes Stellar CLI using an executable and argument array equivalent to:

```text
stellar contract deploy --source-account deployer --network testnet
```

No shell interpolation is used. Deployment output is streamed to the terminal. A failed Stellar CLI process produces a non-zero StellarForge subprocess result. Signing material remains under Stellar CLI identity management and must never be committed to the project or passed as a raw StellarForge argument.

Each implemented command should document arguments/options, examples, exit behavior, security-sensitive behavior, and configuration requirements here or in a dedicated reference page.
