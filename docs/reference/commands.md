# Command Reference

This reference documents the implemented StellarForge CLI MVP command surface.

## Command status

| Command                           | Purpose                                                      | Status                              |
| --------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| `stellarforge --help`             | Show root usage and available commands                       | Implemented                         |
| `stellarforge --version`          | Show the installed CLI package version                       | Implemented                         |
| `stellarforge completion <shell>` | Print a shell completion script for supported shells         | Implemented                         |
| `stellarforge new <project-name>` | Generate a supported StellarForge project                    | Implemented                         |
| `stellarforge doctor`             | Validate the local development toolchain                     | Implemented                         |
| `stellarforge dev`                | Start a supported generated Node.js project                  | Implemented                         |
| `stellarforge test`               | Run a supported project test workflow                        | Implemented                         |
| `stellarforge deploy`             | Deploy a supported smart-contract project to Stellar Testnet | Implemented                         |
| `stellarforge add`                | Add modules/plugins                                          | Not implemented / post-v1 candidate |

See also [Installation](../guides/installation.md), [Quick Start](../guides/quick-start.md), [Configuration](configuration.md), [Exit Codes](exit-codes.md), [Troubleshooting](troubleshooting.md#find-your-problem), [Platform Support](platform-support.md), and the repository [security guidance](../../SECURITY.md).

## Global command behavior

### Help

```bash
stellarforge --help
stellarforge new --help
```

Help exits successfully with code `0`.

### Version

```bash
stellarforge --version
```

The version comes from installed package metadata. No registry request or subprocess is used.

Unknown commands, unknown options, and missing required positional arguments are usage failures and exit with code `2`.

## `stellarforge completion <shell>`

Prints a shell completion script for the registered CLI command and option inventory to standard output.

### Usage

```bash
stellarforge completion <shell>
```

Supported shells are:

- `bash`;
- `zsh`;
- `fish`.

Completion output is generated from the existing command tree. The command does not perform network access, does not write to the filesystem, and does not execute shell code or install completion scripts automatically. Generated scripts contain only command and option names — no credentials or local paths.

An unsupported or missing shell name is a usage failure and exits with code `2`, listing the supported shells.

### Manual installation

Completion scripts are printed to stdout; redirect them to the location your shell reads. Installation is manual and optional.

Bash (current session):

```bash
source <(stellarforge completion bash)
```

Bash (persistent, user-local):

```bash
stellarforge completion bash > ~/.local/share/bash-completion/completions/stellarforge
```

Zsh (persistent, user-local):

```bash
stellarforge completion zsh > "${fpath[1]}/_stellarforge"
```

Fish (persistent, user-local):

```bash
stellarforge completion fish > ~/.config/fish/completions/stellarforge.fish
```

### Manual removal

Delete the file you created above, for example:

```bash
rm ~/.local/share/bash-completion/completions/stellarforge
rm "${fpath[1]}/_stellarforge"
rm ~/.config/fish/completions/stellarforge.fish
```

Start a new shell session (or re-source your shell configuration) for the change to take effect.

## `stellarforge new <project-name>`

Creates a new project from a bundled, project-controlled template.

### Usage

```bash
stellarforge new <project-name> [options]
```

### Options

| Option                | Meaning                                          |
| --------------------- | ------------------------------------------------ |
| `-t, --template <id>` | Select a bundled template.                       |
| `--dry-run`           | Preview files and substitutions without writing. |

Supported template IDs are:

- `basic-app` — default when `--template` is omitted;
- `full-stack`;
- `smart-contract`;
- `api-service`.

### Examples

```bash
stellarforge new my-app
stellarforge new payments-api --template api-service
stellarforge new escrow-contract -t smart-contract
stellarforge new preview-app --template basic-app --dry-run
```

Generation validates project names and destinations before writing. Existing non-empty destinations are not overwritten. Templates come only from the bundled template registry; arbitrary URLs, filesystem template paths, or executable template code are not accepted.

`--dry-run` performs the same name, destination, template, and template-content validation as generation, then prints the resolved destination, files to add, and substitutions. It does not create or modify any files and works in non-interactive terminals.

See [Template Generation Safety](template-generation.md).

### Common failures

- invalid or missing project name;
- unsupported template ID;
- destination traversal or invalid destination;
- existing non-empty destination;
- invalid bundled template content.

These are validation failures and exit with code `2`.

See [Troubleshooting](troubleshooting.md#stellarforge-new-cannot-create-the-project) and [Project name is rejected](troubleshooting.md#project-name-is-rejected).

## `stellarforge doctor`

Runs the registered development-environment diagnostics.

### Usage

```bash
stellarforge doctor
```

The current diagnostic set checks the supported Node.js/npm runtime and relevant local development tools, including Git, Rust, Cargo, Stellar CLI, and Docker.

The report renders each result, remediation guidance when available, a summary, and an overall health result.

### Exit behavior

- `0` — no required diagnostic failed;
- `5` — one or more required diagnostics failed.

Warnings do not by themselves make the command fail.

The command does not print complete sensitive environment values.

See [Troubleshooting](troubleshooting.md#stellarforge-doctor-reports-failures) when diagnostics fail.

## `stellarforge dev`

Starts the supported local-development workflow for a generated Node.js StellarForge project.

### Usage

```bash
cd my-project
stellarforge dev
```

The command requires a valid project `package.json` with a `scripts` object. Script selection uses the first supported entry in this order:

1. `dev`;
2. `start`;
3. `start:backend`.

A candidate counts as present only when it is a string with a non-blank value; blank or whitespace-only entries are ignored in favour of the next candidate. If every supported candidate is blank or absent, the command fails with actionable guidance before any subprocess is spawned.

StellarForge invokes npm as an executable with an argument array; it does not execute the package script text through a constructed shell command.

Child stdout/stderr are streamed with process labels.

### Common failures

- no `package.json`;
- invalid JSON;
- missing `scripts` object;
- no supported development script;
- child process startup or runtime failure.

Validation failures use code `2`; failed child processes use code `3`.

See [Troubleshooting](troubleshooting.md#stellarforge-dev-says-no-supported-script-exists).

## `stellarforge test`

Runs the supported project test workflow.

### Usage

```bash
cd my-project
stellarforge test
```

Supported project forms are:

- Node.js project with a `package.json` `test` script (non-empty) → `npm run test`;
- Cargo workspace/project with `Cargo.toml` → `cargo test`.

A string-valued but empty or whitespace-only `scripts.test` is rejected with exit `2` before any subprocess is spawned, because npm treats an empty test script as a successful no-op and would report success without running any tests.

When both are present, the Node.js project test workflow is selected first.

StellarForge does not execute package script text directly. It delegates through npm or Cargo and preserves external-process failures.

### Exit behavior

- `0` — test workflow completed successfully;
- `2` — project/test configuration is unsupported or invalid;
- `3` — the test subprocess fails.

See [Troubleshooting](troubleshooting.md#stellarforge-test-cannot-find-a-workflow).

## `stellarforge deploy`

Deploys a supported smart-contract Cargo project to **Stellar Testnet**.

### Usage

Using explicit CLI options:

```bash
stellarforge deploy --network testnet --source deployer
```

Using project configuration:

```json
{
  "version": 1,
  "network": "testnet",
  "identity": "deployer"
}
```

```bash
stellarforge deploy
```

CLI values override corresponding values from `stellarforge.config.json`:

```bash
stellarforge deploy --source release-deployer
```

### Options

| Option                | Meaning                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `--network <network>` | Explicit deployment network. CLI value overrides project configuration.      |
| `--source <identity>` | Named Stellar CLI identity alias. CLI value overrides project configuration. |

The effective network and identity must both be present after configuration resolution.

The MVP deploy
