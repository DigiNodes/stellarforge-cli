# Command Reference

This reference tracks the v1.0 MVP command surface.

| Command | Purpose | MVP Status |
|---|---|---|
| `stellarforge --help` | Show global usage/help | Implemented |
| `stellarforge --version` | Show installed CLI version | Planned — CLI-004 |
| `stellarforge new <name>` | Scaffold a supported Stellar project | Planned |
| `stellarforge doctor` | Validate the development environment | Planned |
| `stellarforge dev` | Orchestrate local development | Planned |
| `stellarforge test` | Run supported tests | Planned |
| `stellarforge deploy` | Deploy supported components to Stellar Testnet | Planned |

## Root Command

The implemented root command is `stellarforge`. It currently provides global help and deterministic parser errors without registering unfinished product commands.

```bash
stellarforge --help
```

Unknown options or positional commands fail with a non-zero exit code and include root usage information. Product commands are added only when their implementation issues are complete.

`stellarforge add` is not part of the v1.0 MVP.

Each implemented command should document arguments/options, examples, exit behavior, security-sensitive behavior, and configuration requirements here or in a dedicated reference page.
