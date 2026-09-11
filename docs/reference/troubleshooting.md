# Troubleshooting

This page covers common failures in the implemented StellarForge CLI MVP.

For numeric failure categories, see [Exit Codes](exit-codes.md).

## Command or option is not recognized

Run:

```bash
stellarforge --help
stellarforge <command> --help
```

Unknown commands/options and missing required positional arguments are usage failures and exit with code `2`.

`stellarforge add`, plugin commands, and remote-template commands are not implemented in the MVP.

## `stellarforge new` cannot create the project

Check:

- the project name is present and valid;
- the requested template is one of `basic-app`, `full-stack`, `smart-contract`, or `api-service`;
- the destination is within the allowed working path;
- the target directory is not an existing non-empty directory.

StellarForge intentionally refuses unsafe paths, unsupported templates, symlinked template entries, and implicit overwrite behavior.

## `stellarforge doctor` reports failures

Read the remediation line printed under each failed diagnostic.

The current diagnostics cover the Node.js/npm runtime and local tools used by supported workflows, including Git, Rust, Cargo, Stellar CLI, and Docker.

A diagnostic failure exits with code `5`. A warning may indicate a usable but incomplete environment and does not by itself fail the command.

## `stellarforge dev` says no supported script exists

The project must contain a valid `package.json` with a `scripts` object and at least one of:

```text
dev
start
start:backend
```

Selection follows that order.

If the selected npm process starts and then fails, StellarForge returns subprocess exit category `3`.

## `stellarforge test` cannot find a workflow

A supported test project must have either:

- `package.json` with a string `scripts.test` entry; or
- `Cargo.toml`.

Node.js projects are run through `npm run test`; Cargo projects are run through `cargo test`.

A failing project test is preserved as a subprocess failure instead of being converted to success.

## Configuration file is rejected

The file must be named exactly:

```text
stellarforge.config.json
```

and live at the project root.

It must be a regular non-symlink file, no larger than 64 KiB, and contain valid JSON with schema version `1`.

Supported fields are only:

- `version`;
- `network`;
- `identity`.

Secret-bearing fields such as private keys, seed phrases, tokens, passwords, or mnemonic data are intentionally rejected. Validation messages do not echo secret values.

See [Configuration](configuration.md).

## Deployment network is required

Provide either project configuration:

```json
{
  "version": 1,
  "network": "testnet",
  "identity": "deployer"
}
```

or CLI options:

```bash
stellarforge deploy --network testnet --source deployer
```

There is no implicit network default.

## Deployment rejects Mainnet or Futurenet

This is expected. The MVP deploy command is deliberately Testnet-only.

Even though the configuration schema recognizes `mainnet` and `futurenet` as explicit network values, deployment rejects them. Mainnet deployment requires separate architecture and security work.

## Deployment identity is rejected

Use the **name** of a Stellar CLI identity, for example:

```bash
stellarforge deploy --network testnet --source deployer
```

Do not pass:

- a raw `S...` secret StrKey;
- a `G...` public/account StrKey;
- a seed phrase;
- a filesystem path;
- an option-like value beginning with `-`.

StellarForge delegates signing to Stellar CLI identity management.

## Stellar CLI deployment fails

First run:

```bash
stellarforge doctor
```

Then verify that:

- Stellar CLI is installed and usable;
- the named identity exists in Stellar CLI;
- the project contains `Cargo.toml`;
- the selected network is `testnet`;
- the local environment can reach the required Stellar Testnet services.

A failed external process returns exit category `3`.

## Sensitive information appeared in a failure

StellarForge errors are designed not to render raw secrets. Do not paste private keys, seed phrases, access tokens, or complete credential-bearing environment values into public issues.

If you believe a secret disclosure is caused by a vulnerability, follow [SECURITY.md](../../SECURITY.md) instead of opening a public issue.

## Still blocked?

Collect only non-sensitive information:

- StellarForge CLI version;
- command name and sanitized arguments;
- exit code;
- operating system;
- relevant tool versions;
- the safe error message;
- minimal project layout information.

Do not include secrets, full environment dumps, wallet seed material, or private signing keys.
