# Quick Start

This guide uses the currently implemented StellarForge CLI MVP commands.

For contributor installation, see [Installation](installation.md). For full options and failure behavior, see the [Command Reference](../reference/commands.md).

## 1. Create a project

The default template is `basic-app`:

```bash
stellarforge new my-app
cd my-app
```

Or choose one of the other bundled templates:

```bash
stellarforge new my-api --template api-service
stellarforge new my-contract --template smart-contract
stellarforge new my-stack --template full-stack
```

Supported template IDs are `basic-app`, `full-stack`, `smart-contract`, and `api-service`.

## 2. Validate your environment

```bash
stellarforge doctor
```

The command checks the supported local toolchain and prints remediation guidance. A failed required diagnostic exits with code `5`.

## 3. Run local development

From a supported generated Node.js project:

```bash
stellarforge dev
```

StellarForge looks for a supported npm development script: `dev`, then `start`, then `start:backend`.

## 4. Run tests

```bash
stellarforge test
```

Node.js projects use `npm run test`; Cargo projects use `cargo test`.

## 5. Configure Testnet deployment

For a smart-contract project, create `stellarforge.config.json` at the project root:

```json
{
  "version": 1,
  "network": "testnet",
  "identity": "deployer"
}
```

The identity must already exist in Stellar CLI identity management. Do not place raw secret keys or seed phrases in project configuration.

See the [Configuration Reference](../reference/configuration.md).

## 6. Deploy to Testnet

```bash
stellarforge deploy
```

Or override configuration explicitly:

```bash
stellarforge deploy --network testnet --source deployer
```

The MVP deployment path is Testnet-only. Mainnet deployment is not implemented.

## Next references

- [Command Reference](../reference/commands.md)
- [Troubleshooting](../reference/troubleshooting.md)
- [Exit Code Policy](../reference/exit-codes.md)
- [Security Policy](../../SECURITY.md)
