# Installation

StellarForge CLI is the primary command-line tool for scaffolding, developing, testing, and deploying Stellar applications. The published package is [`@diginodes/stellarforge-cli`](https://www.npmjs.com/package/@diginodes/stellarforge-cli), and the binary command it registers is `stellarforge`.

## Runtime prerequisites

Before installing or running StellarForge CLI, ensure your environment meets the supported runtime requirements:

- **Node.js**: `>=22.13.0 <25` (Node.js 22 LTS or Node.js 24);
- **npm**: `>=10.9.0`;
- **Supported operating systems**: Linux, macOS, and Windows.

Verify your current Node.js and npm versions:

```bash
node --version
npm --version
```

If your Node.js or npm version is below the supported threshold, update Node.js via your system package manager or a Node version manager such as `nvm`, `fnm`, or `volta`. See [Platform Support](../reference/platform-support.md) for details.

## Clean-room CLI installation

There are two primary ways to run the published StellarForge CLI in a clean-room environment without maintaining a local source checkout: on-demand invocation via `npx`, and global installation via `npm install -g`.

### Option A: On-demand invocation with `npx` (recommended)

For scaffolding new projects or running commands without permanently altering global package state or modifying `PATH`:

```bash
npx @diginodes/stellarforge-cli --version
npx @diginodes/stellarforge-cli --help
npx @diginodes/stellarforge-cli new my-app
```

`npx` fetches `@diginodes/stellarforge-cli` into a transient cache and invokes the `stellarforge` binary command directly. This approach:

- requires zero manual `PATH` configuration;
- avoids conflicts with other global packages or permission issues;
- is ideal for CI runners, temporary environments, and quick project initialization.

### Option B: Global installation with `npm install -g`

To make the `stellarforge` command permanently available across terminal sessions:

```bash
npm install -g @diginodes/stellarforge-cli
```

Once installed, invoke the CLI directly:

```bash
stellarforge --version
stellarforge --help
stellarforge new my-app
```

### Option C: Local project dependency

To lock StellarForge CLI to a specific project workspace:

```bash
npm install --save-dev @diginodes/stellarforge-cli
```

Then invoke it using `npx` within the project root:

```bash
npx stellarforge --version
```

## PATH troubleshooting

If you installed globally with `npm install -g @diginodes/stellarforge-cli` but running `stellarforge` returns:

- `stellarforge: command not found` (Linux / macOS)
- `'stellarforge' is not recognized as an internal or external command` (Windows)

This indicates that npm's global binaries directory is not included in your shell's `PATH` environment variable. Follow these diagnosis steps without running commands that leak environment secrets.

### 1. Locate the global npm bin directory

Run:

```bash
npm config get prefix
```

This prints npm's configured global prefix:

- **macOS / Linux**: Global executables reside in `<prefix>/bin` (for example, `/usr/local/bin` or `~/.npm-global/bin`).
- **Windows**: Global executables and command shims (`stellarforge.cmd`, `stellarforge.ps1`) reside directly in the prefix directory (typically `%APPDATA%\npm`, such as `C:\Users\<User>\AppData\Roaming\npm`).

### 2. Verify whether the directory is in your PATH

Check if the executable can be located by your system:

- **Linux / macOS**:
  ```bash
  which stellarforge
  ```
  If not found, inspect your `PATH` without dumping all environment variables:
  ```bash
  echo "$PATH"
  ```
- **Windows (PowerShell)**:
  ```powershell
  Get-Command stellarforge
  ```
  Or check if npm is in your PATH list:
  ```powershell
  $env:PATH -split ';' | Select-String 'npm'
  ```
- **Windows (Command Prompt)**:
  ```cmd
  where stellarforge
  ```

> [!NOTE]
> **Secret safety:** Do not run broad environment-listing commands or print full process environment variables to troubleshoot PATH issues. Dumping your entire environment may expose private tokens, secrets, or API credentials in your terminal scrollback or session logs. Always inspect specific variables (such as `echo "$PATH"`) instead.

### 3. Safely resolve PATH without blind shell edits

Do not edit shell configuration files blindly (such as `~/.bashrc`, `~/.zshrc`, or Windows registry entries) without confirming your active shell and environment manager:

- **Using a Node version manager (`nvm`, `fnm`, `volta`, `asdf`)**:
  Version managers handle global binaries automatically. If `stellarforge` is not found, verify that the version manager is initialized in your current shell session, or open a fresh terminal window after installation.
- **Using a custom npm prefix on Linux / macOS**:
  If you configured a custom prefix like `npm config set prefix '~/.npm-global'`, add the corresponding `~/.npm-global/bin` directory to `PATH` in your shell's profile file (e.g., `~/.bashrc` for Bash, `~/.zshrc` for Zsh) only after confirming your active shell.
- **Windows installer path**:
  If installed via the official Node.js Windows installer, ensure `%APPDATA%\npm` is present in your User Environment Variables under `Path`. After updating environment variables via Windows System Settings, restart your terminal or editor (such as VS Code) for the changes to take effect.
- **Zero-configuration alternative**:
  If you prefer not to modify system or shell PATH configuration, use `npx @diginodes/stellarforge-cli` instead. It always resolves and executes without manual PATH changes.

## Contributor prerequisites

The current runtime support contract is:

- Node.js `>=22.13.0 <25`;
- npm `>=10.9.0`;
- supported Node.js majors: 22 and 24;
- Linux, macOS, and Windows are exercised by the repository CI matrix.

Repository toolchain metadata currently records npm `10.9.2`.

Rust and Cargo are not required for most TypeScript contributions. When Cargo is available, the test suite also validates the generated Smart Contract workspace with `cargo metadata`; that one external-tool validation is skipped when Cargo is absent. Contributors working on Smart Contract or Cargo-specific issues should install a supported Rust toolchain and confirm `cargo --version` succeeds.

See [Platform Support](../reference/platform-support.md). Do not use an end-of-life or unsupported Node release for development or CI.

## Contributor setup

```bash
git clone https://github.com/DigiNodes/stellarforge-cli.git
cd stellarforge-cli
npm ci
```

Run the complete local validation set before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

The repository uses npm and commits `package-lock.json` for deterministic installation. Do not substitute another package manager without an explicit project decision.

## Local CLI invocation

Build the CLI before invoking the compiled executable from a source checkout:

```bash
npm run build
node dist/cli.js --help
node dist/cli.js --version
```

The package metadata maps the installed command name `stellarforge` to `dist/cli.js`. For local executable testing, npm can link the built checkout:

```bash
npm link --ignore-scripts
stellarforge --help
stellarforge --version
```

Local linking modifies the developer's npm environment. It is not required for normal repository tests and should not be used in privileged/global system contexts.

The implemented command behavior is documented in the [Command Reference](../reference/commands.md).

Do not install undocumented global dependencies. Stellar-specific tools required by individual commands are documented with those commands and validated by `stellarforge doctor` where applicable.

## Public npm installation

The package metadata is publication-ready (`private: false`), and protected release automation is implemented. The package is published on npm as [`@diginodes/stellarforge-cli`](https://www.npmjs.com/package/@diginodes/stellarforge-cli).

Install or execute the CLI in a clean-room environment as documented above in [Clean-room CLI installation](#clean-room-cli-installation).

## Release security state

The release workflow is designed around:

- Changesets;
- release artifact validation;
- npm Trusted Publishing/OIDC;
- a protected GitHub `npm-release` environment;
- no long-lived `NPM_TOKEN`;
- npm provenance where supported.

The npm namespace, Trusted Publisher, protected GitHub environment, and Dependency Graph are configured. `NPM_PUBLISH_ENABLED` remains `false` as a deliberate kill switch. REL-001 remains open only for the first approved protected OIDC publication and its npm/tag/GitHub Release/provenance verification.

See [Release Process](../contributing/release-process.md) for the complete release contract.

## Troubleshooting

If installation or local setup fails, see [Troubleshooting](../reference/troubleshooting.md#installation-or-setup-fails) and [PATH troubleshooting](#path-troubleshooting). Runtime and operating-system expectations are in [Platform Support](../reference/platform-support.md), and exit codes are defined in the [Exit Code Policy](../reference/exit-codes.md).
