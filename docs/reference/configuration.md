# Configuration Reference

StellarForge uses an optional project-root configuration file named `stellarforge.config.json`.

## MVP schema

```json
{
  "version": 1,
  "network": "testnet",
  "identity": "deployer"
}
```

`version` is required and must currently be `1`.

`network` is optional and accepts `testnet`, `futurenet`, or `mainnet`. A configured network does not bypass command-specific restrictions: the MVP deploy command still permits Testnet only.

`identity` is optional and must be the name of an identity already managed by Stellar CLI. StellarForge does not accept raw secret keys, seed phrases, public StrKeys, filesystem paths, tokens, or password-like fields in project configuration.

## Precedence

Where a command exposes a CLI override, the order is:

1. explicit CLI option;
2. project configuration;
3. missing.

StellarForge does not silently default a missing network to Mainnet or any other network.

For example:

```json
{
  "version": 1,
  "network": "testnet",
  "identity": "team-deployer"
}
```

allows:

```bash
stellarforge deploy
```

to use those project settings, while:

```bash
stellarforge deploy --source release-deployer
```

overrides only the identity.

## Test timeout

`stellarforge test` runs the generated project's test command with a bounded execution time so a hung test command cannot block a developer indefinitely.

The default timeout is **300 seconds (5 minutes)**. This default is documented here as the public behavior of `stellarforge test`.

The timeout is configurable only through the approved interface: the `--timeout` command-line option on `stellarforge test`.

```bash
stellarforge test --timeout 600
```

The value is expressed in seconds and must be a positive integer. The timeout is not read from `stellarforge.config.json` and is not applied to `stellarforge dev` unless explicitly configured there.

When the timeout is reached, StellarForge:

- stops the child process tree within a bounded grace period;
- reports a timeout exit code distinct from a test failure;
- prints a clear message identifying the timeout and the configured limit.

Test failures (non-zero exits from the test command) remain distinguishable from timeouts in both the exit code and the reported output.

## Loading and validation

The file must:

- live at the project root;
- be a regular file rather than a symbolic link;
- be no larger than 64 KiB;
- be encoded as UTF-8 (a single leading UTF-8 byte-order mark is tolerated);
- contain valid JSON with no duplicate object keys;
- contain no duplicate object keys at any nesting level (escaped-equivalent spellings are treated as the same key);
- contain only supported schema fields.

Validation failures are designed to be actionable without echoing raw file contents or sensitive values.

If the file is rejected, see [Troubleshooting](troubleshooting.md#configuration-file-is-rejected). For deployment settings, see [Deployment network is required](troubleshooting.md#deployment-network-is-required) and [Deployment identity is rejected](troubleshooting.md#deployment-identity-is-rejected).
